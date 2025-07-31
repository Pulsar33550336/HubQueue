
'use server';

import { createClient, WebDAVClient } from 'webdav';
import { webdavConfig } from '@/config/webdav';
import type { ImageFile } from '@/types';
import Ably from 'ably';

// Define types locally since sqlite.ts is removed
export type UserRole = 'admin' | 'trusted' | 'user' | 'banned';
export interface StoredUser {
  username: string;
  passwordHash: string;
  role: UserRole;
}


const ABLY_API_KEY = process.env.ABLY_API_KEY;
const ABLY_CHANNEL_NAME = 'hubqueue:updates';

// --- File Paths on WebDAV ---
const USERS_FILE = '/users.json';
const IMAGES_FILE = '/images.json';
const HISTORY_FILE = '/history.json';
const MAINTENANCE_FILE = '/maintenance.json';
const UPLOADS_DIR = '/uploads';
const LOCK_FILE = '/~lock';


// --- WebDAV Client & Locking Mechanism ---

function getWebdavClient(): WebDAVClient {
  if (!webdavConfig.url || !webdavConfig.username || !webdavConfig.password) {
    throw new Error('WebDAV configuration is incomplete. Please check your .env file.');
  }
  return createClient(webdavConfig.url, {
    username: webdavConfig.username,
    password: webdavConfig.password,
  });
}

const acquireLock = async (client: WebDAVClient, retries = 5, delay = 200): Promise<boolean> => {
  for (let i = 0; i < retries; i++) {
    try {
      // The 'wx' flag means "write if not exists", which is an atomic operation for locking.
      await client.putFileContents(LOCK_FILE, '', { flag: 'wx' });
      return true; // Lock acquired
    } catch (error: any) {
      if (error.status === 412) { // Precondition Failed - lock file exists
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error; // Other unexpected error
      }
    }
  }
  return false; // Failed to acquire lock
};

const releaseLock = async (client: WebDAVClient) => {
  try {
    if (await client.exists(LOCK_FILE)) {
      await client.deleteFile(LOCK_FILE);
    }
  } catch (error) {
    console.error("Failed to release lock, it may need to be manually removed:", error);
  }
};


// --- Ably Notifications ---

async function notifyQueueUpdate(client: WebDAVClient) {
  if (!ABLY_API_KEY) {
    console.warn("Ably API Key not found, skipping notification.");
    return;
  }
  try {
    // Read the latest state of both lists to send the complete data
    const [images, history] = await Promise.all([
        readFile<ImageFile[]>(client, IMAGES_FILE, []),
        readFile<ImageFile[]>(client, HISTORY_FILE, [])
    ]);

    const imagesWithUrls = images.map(img => ({
        ...img,
        url: `/api/image?path=${encodeURIComponent(img.webdavPath)}`
    }));

     const historyWithUrls = history.map(img => ({
        ...img,
        url: `/api/image?path=${encodeURIComponent(img.webdavPath)}`
    }));


    const ably = new Ably.Rest(ABLY_API_KEY);
    const channel = ably.channels.get(ABLY_CHANNEL_NAME);
    await channel.publish('queue_updated', { images: imagesWithUrls, history: historyWithUrls });
  } catch (error) {
    console.error('Failed to notify Ably with queue update:', error);
  }
}

async function notifySystemUpdate() {
   if (!ABLY_API_KEY) {
    console.warn("Ably API Key not found, skipping notification.");
    return;
  }
  try {
    const ably = new Ably.Rest(ABLY_API_KEY);
    const channel = ably.channels.get(ABLY_CHANNEL_NAME);
    await channel.publish('system_updated', {});
  } catch (error) {
    console.error('Failed to notify Ably with system update:', error);
  }
}


// --- Generic Read/Write with Locking ---

async function readFile<T>(client: WebDAVClient, filePath: string, defaultValue: T): Promise<T> {
    try {
        if (await client.exists(filePath)) {
            const content = await client.getFileContents(filePath, { format: 'text' }) as string;
            return JSON.parse(content) as T;
        }
    } catch (error) {
        console.error(`Failed to read or parse ${filePath}, returning default.`, error);
    }
    return defaultValue;
}


async function writeFile<T>(client: WebDAVClient, filePath: string, data: T): Promise<{success: boolean, error?: string}> {
    try {
        await client.putFileContents(filePath, JSON.stringify(data, null, 2));
        return { success: true };
    } catch (error: any) {
        console.error(`Failed to write to ${filePath}.`, error);
        return { success: false, error: error.message };
    }
}


// --- High-Level Data Functions ---

export async function getUsers(): Promise<StoredUser[]> {
    const client = getWebdavClient();
    return readFile<StoredUser[]>(client, USERS_FILE, []);
}

export async function saveUsers(users: StoredUser[]): Promise<{success: boolean, error?: string}> {
    const client = getWebdavClient();
    if (!await acquireLock(client)) return { success: false, error: 'Could not acquire a lock to save users. Please try again.' };

    try {
        const result = await writeFile(client, USERS_FILE, users);
        if (result.success) {
            await notifySystemUpdate();
        }
        return result;
    } finally {
        await releaseLock(client);
    }
}


export async function addUser(user: StoredUser): Promise<{success: boolean, error?: string}> {
    const client = getWebdavClient();
    if (!await acquireLock(client)) return { success: false, error: 'Could not acquire a lock to add user. Please try again.' };

    try {
        const users = await readFile<StoredUser[]>(client, USERS_FILE, []);
        if (users.some(u => u.username === user.username)) {
            return { success: false, error: 'User already exists.' };
        }
        users.push(user);
        
        const result = await writeFile(client, USERS_FILE, users);
        if (result.success) {
            await notifySystemUpdate();
        }
        return result;
    } finally {
        await releaseLock(client);
    }
}

export async function getImageList(): Promise<ImageFile[]> {
    const client = getWebdavClient();
    const images = await readFile<ImageFile[]>(client, IMAGES_FILE, []);
    return images.map(img => ({
        ...img,
        url: `/api/image?path=${encodeURIComponent(img.webdavPath)}`
    }));
}

export async function addImage(image: Omit<ImageFile, 'url'>): Promise<{success: boolean, error?: string}> {
    const client = getWebdavClient();
    if (!await acquireLock(client)) return { success: false, error: 'Could not acquire a lock to add image. Please try again.' };

    try {
        const images = await readFile<ImageFile[]>(client, IMAGES_FILE, []);
        images.unshift({ ...image, url: '' }); // URL is generated on client or on read, not stored
        const result = await writeFile(client, IMAGES_FILE, images);
        if (result.success) {
            await notifyQueueUpdate(client);
        }
        return result;
    } finally {
        await releaseLock(client);
    }
}


export async function updateImage(image: ImageFile): Promise<{success: boolean, error?: string}> {
    const client = getWebdavClient();
    if (!await acquireLock(client)) return { success: false, error: 'Could not acquire a lock to update image. Please try again.' };

    try {
        if (image.status === 'completed') {
            const [images, history] = await Promise.all([
                readFile<ImageFile[]>(client, IMAGES_FILE, []),
                readFile<ImageFile[]>(client, HISTORY_FILE, [])
            ]);

            const imageToMoveIndex = images.findIndex(img => img.id === image.id);
            if (imageToMoveIndex === -1) return { success: false, error: 'Image not found in queue.' };

            const [imageToMove] = images.splice(imageToMoveIndex, 1);
            const updatedImage = { ...imageToMove, ...image, url: '' };
            history.unshift(updatedImage); 

            const saveImagesResult = await writeFile(client, IMAGES_FILE, images);
            const saveHistoryResult = await writeFile(client, HISTORY_FILE, history);
            
            if (saveImagesResult.success && saveHistoryResult.success) {
                 await notifyQueueUpdate(client);
                 return { success: true };
            } else {
                console.error(`CRITICAL: Failed to complete image transaction for ID ${image.id}. Images file success: ${saveImagesResult.success}, History file success: ${saveHistoryResult.success}`);
                return { success: false, error: 'Failed to complete image transaction.' };
            }

        } else {
            const images = await readFile<ImageFile[]>(client, IMAGES_FILE, []);
            const imageIndex = images.findIndex(img => img.id === image.id);
            if (imageIndex === -1) return { success: false, error: 'Image not found in queue.' };
            
            // Do not store the full URL
            const { url, ...imageToStore } = image;
            images[imageIndex] = { ...images[imageIndex], ...imageToStore };

            const result = await writeFile(client, IMAGES_FILE, images);
            if (result.success) {
                 await notifyQueueUpdate(client);
            }
            return result;
        }
    } finally {
        await releaseLock(client);
    }
}

export async function deleteImage(id: string): Promise<{success: boolean, error?: string}> {
    const client = getWebdavClient();
    if (!await acquireLock(client)) return { success: false, error: 'Could not acquire a lock to delete image. Please try again.' };

    try {
        const images = await readFile<ImageFile[]>(client, IMAGES_FILE, []);
        const filteredImages = images.filter(img => img.id !== id);

        if (images.length === filteredImages.length) {
            return { success: false, error: 'Image not found to delete.' };
        }

        const result = await writeFile(client, IMAGES_FILE, filteredImages);
        if (result.success) {
            await notifyQueueUpdate(client);
        }
        return result;
    } finally {
        await releaseLock(client);
    }
}


export async function getHistoryList(): Promise<ImageFile[]> {
    const client = getWebdavClient();
    const history = await readFile<ImageFile[]>(client, HISTORY_FILE, []);
    return history.map(img => ({
        ...img,
        url: `/api/image?path=${encodeURIComponent(img.webdavPath)}`
    }));
}


export async function getMaintenanceStatus(): Promise<{ isMaintenance: boolean }> {
    const client = getWebdavClient();
    return readFile<{ isMaintenance: boolean }>(client, MAINTENANCE_FILE, { isMaintenance: false });
}

export async function saveMaintenanceStatus(status: { isMaintenance: boolean }): Promise<{ success: boolean, error?: string }> {
    const client = getWebdavClient();
    const result = await writeFile(client, MAINTENANCE_FILE, status);
    if(result.success) {
        await notifySystemUpdate();
    }
    return result;
}

export async function uploadToWebdav(fileName: string, dataUrl: string): Promise<{success: boolean, path?: string, error?: string}> {
  const client = getWebdavClient();
  const buffer = Buffer.from(dataUrl.split(',')[1], 'base64');
  
  try {
    const filePath = `${UPLOADS_DIR}/${fileName}`;
    
    if (!(await client.exists(UPLOADS_DIR))) {
        await client.createDirectory(UPLOADS_DIR);
    }

    const success = await client.putFileContents(filePath, buffer);
    if (success) {
      console.log(`${fileName} uploaded successfully.`);
      return { success: true, path: filePath };
    } else {
      throw new Error('WebDAV server returned an error on upload.');
    }
  } catch (error: any) {
    console.error('Failed to upload to WebDAV', error);
    return { success: false, error: error.message || 'An unknown error occurred during upload.' };
  }
}

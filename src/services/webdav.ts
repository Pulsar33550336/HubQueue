
'use server';

import { createClient, WebDAVClient } from 'webdav';
import { webdavConfig } from '@/config/webdav';
import type { ImageFile } from '@/types';

const IMAGES_JSON_PATH = '/images.json';
const HISTORY_JSON_PATH = '/history.json';
const USERS_JSON_PATH = '/users.json';
const MAINTENANCE_JSON_PATH = '/maintenance.json';

export interface StoredUser {
  username: string;
  isAdmin: boolean;
  isTrusted: boolean;
  passwordHash: string;
}

function getClient(): WebDAVClient {
  if (!webdavConfig.url || !webdavConfig.username || !webdavConfig.password) {
    throw new Error('WebDAV configuration is incomplete. Please check your .env file.');
  }
  return createClient(webdavConfig.url, {
    username: webdavConfig.username,
    password: webdavConfig.password,
  });
}

export async function uploadToWebdav(fileName: string, dataUrl: string): Promise<{success: boolean, path?: string, error?: string}> {
  const client = getClient();
  const buffer = Buffer.from(dataUrl.split(',')[1], 'base64');
  
  try {
    const uploadsPath = '/uploads';
    const filePath = `${uploadsPath}/${fileName}`;
    
    if (!(await client.exists(uploadsPath))) {
        await client.createDirectory(uploadsPath);
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

export async function getImageList(): Promise<ImageFile[]> {
  const client = getClient();
  try {
    if (await client.exists(IMAGES_JSON_PATH)) {
      const content = await client.getFileContents(IMAGES_JSON_PATH, { format: 'text' });
      return JSON.parse(content as string);
    }
    return [];
  } catch (error: any) {
    console.error('Failed to get image list from WebDAV', error);
    return [];
  }
}

export async function saveImageList(images: ImageFile[]): Promise<{success: boolean, error?: string}> {
  const client = getClient();
  try {
    await client.putFileContents(IMAGES_JSON_PATH, JSON.stringify(images, null, 2));
    console.log('Image list saved successfully to WebDAV.');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to save image list to WebDAV', error);
    return { success: false, error: error.message || 'An unknown error occurred during save.' };
  }
}

export async function getHistoryList(): Promise<ImageFile[]> {
  const client = getClient();
  try {
    if (await client.exists(HISTORY_JSON_PATH)) {
      const content = await client.getFileContents(HISTORY_JSON_PATH, { format: 'text' });
      return JSON.parse(content as string);
    }
    return [];
  } catch (error) {
    console.error('Failed to get history list from WebDAV', error);
    return [];
  }
}

export async function saveHistoryList(images: ImageFile[]): Promise<{success: boolean, error?: string}> {
  const client = getClient();
  try {
    await client.putFileContents(HISTORY_JSON_PATH, JSON.stringify(images, null, 2));
    console.log('History list saved successfully to WebDAV.');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to save history list to WebDAV', error);
    return { success: false, error: error.message || 'An unknown error occurred during save.' };
  }
}

export async function deleteWebdavFile(path: string): Promise<{success: boolean, error?: string}> {
    const client = getClient();
    try {
        if (await client.exists(path)) {
            await client.deleteFile(path);
        }
        return { success: true };
    } catch (error: any) {
        console.error(`Failed to delete file from WebDAV: ${path}`, error);
        return { success: false, error: error.message };
    }
}

export async function getUsers(): Promise<StoredUser[]> {
  const client = getClient();
  try {
    if (await client.exists(USERS_JSON_PATH)) {
      const content = await client.getFileContents(USERS_JSON_PATH, { format: 'text' });
      return JSON.parse(content as string);
    }
    return [];
  } catch (error) {
    return [];
  }
}

export async function saveUsers(users: StoredUser[]): Promise<{success: boolean, error?: string}> {
  const client = getClient();
  try {
    await client.putFileContents(USERS_JSON_PATH, JSON.stringify(users, null, 2));
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getMaintenanceStatus(): Promise<{ isMaintenance: boolean }> {
  const client = getClient();
  try {
    if (await client.exists(MAINTENANCE_JSON_PATH)) {
      const content = await client.getFileContents(MAINTENANCE_JSON_PATH, { format: 'text' });
      return JSON.parse(content as string);
    }
    return { isMaintenance: false };
  } catch (error) {
    return { isMaintenance: false };
  }
}

export async function saveMaintenanceStatus(status: { isMaintenance: boolean }): Promise<{ success: boolean, error?: string }> {
  const client = getClient();
  try {
    await client.putFileContents(MAINTENANCE_JSON_PATH, JSON.stringify(status, null, 2));
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

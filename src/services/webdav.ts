
'use server';

import { createClient, WebDAVClient } from 'webdav';
import { webdavConfig } from '@/config/webdav';
import type { ImageFile } from '@/types';
import Ably from 'ably';

const ABLY_API_KEY = process.env.ABLY_API_KEY;
const ABLY_CHANNEL_NAME = 'hubqueue:updates';

interface NotificationPayload {
  type: 'add' | 'update' | 'complete' | 'delete' | 'users' | 'maintenance';
  payload: any;
}

// Internal function to notify Ably
async function notifyClients(notification: NotificationPayload) {
  if (!ABLY_API_KEY) {
    console.warn("Ably API Key not found, skipping notification.");
    return;
  }
  try {
    const ably = new Ably.Rest(ABLY_API_KEY);
    const channel = ably.channels.get(ABLY_CHANNEL_NAME);
    let messageName = '';
    let messageData = notification.payload;

    switch(notification.type) {
      case 'add':
        messageName = 'image_added';
        break;
      case 'update':
        messageName = 'image_updated';
        break;
      case 'complete':
        messageName = 'image_completed';
        break;
      case 'delete':
        messageName = 'image_deleted';
        break;
      default:
        messageName = 'general_update';
        messageData = { type: notification.type };
    }
    
    await channel.publish(messageName, messageData);
  } catch (error) {
    console.error('Failed to notify Ably:', error);
  }
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

export type UserRole = 'admin' | 'trusted' | 'user' | 'banned';

export interface StoredUser {
  username: string;
  passwordHash: string;
  role: UserRole;
}

// This is the old format, kept for migration purposes.
interface LegacyStoredUser {
  username: string;
  passwordHash: string;
  isAdmin: boolean;
  isTrusted: boolean;
  isBanned?: boolean;
}


function migrateUser(user: LegacyStoredUser | StoredUser): StoredUser {
    if ('role' in user) {
        return user; // Already new format
    }
    // Migration logic for old format
    const legacyUser = user as LegacyStoredUser;
    let role: UserRole = 'user';
    if (legacyUser.isAdmin) {
        role = 'admin';
    } else if (legacyUser.isTrusted) {
        role = 'trusted';
    }
    if (legacyUser.isBanned) {
        role = 'banned';
    }
    return {
        username: legacyUser.username,
        passwordHash: legacyUser.passwordHash,
        role: role
    };
}

const UPLOADS_DIR = '/uploads';

export async function uploadToWebdav(fileName: string, dataUrl: string): Promise<{success: boolean, path?: string, error?: string}> {
  const client = getClient();
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

const IMAGES_JSON_PATH = '/images.json';
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

export async function saveImageList(images: ImageFile[], notification?: NotificationPayload): Promise<{success: boolean, error?: string}> {
  const client = getClient();
  try {
    await client.putFileContents(IMAGES_JSON_PATH, JSON.stringify(images, null, 2));
    console.log('Image list saved successfully to WebDAV.');
    if (notification) {
        await notifyClients(notification);
    }
    return { success: true };
  } catch (error: any) {
    console.error('Failed to save image list to WebDAV', error);
    return { success: false, error: error.message || 'An unknown error occurred during save.' };
  }
}

const HISTORY_JSON_PATH = '/history.json';
export async function getHistoryList(): Promise<ImageFile[]> {
  const client = getClient();
  try {
    if (await client.exists(HISTORY_JSON_PATH)) {
      const content = await client.getFileContents(HISTORY_JSON_PATH, { format: 'text' });
      return JSON.parse(content as string);
    }
    return [];
  } catch (error: any) {
    console.error('Failed to get history list from WebDAV', error);
    return [];
  }
}

export async function saveHistoryList(images: ImageFile[]): Promise<{success: boolean, error?: string}> {
  const client = getClient();
  try {
    await client.putFileContents(HISTORY_JSON_PATH, JSON.stringify(images, null, 2));
    console.log('History list saved successfully to WebDAV.');
    // History updates are usually secondary to image list updates, so no separate notification is sent
    // unless specifically needed. The 'complete' action handles this.
    return { success: true };
  } catch (error: any) {
    console.error('Failed to save history list to WebDAV', error);
    return { success: false, error: error.message || 'An unknown error occurred during save.' };
  }
}

const USERS_JSON_PATH = '/users.json';
export async function getUsers(): Promise<StoredUser[]> {
  const client = getClient();
  try {
    if (await client.exists(USERS_JSON_PATH)) {
      const content = await client.getFileContents(USERS_JSON_PATH, { format: 'text' });
      const users = JSON.parse(content as string) as (StoredUser | LegacyStoredUser)[];
      // Check if migration is needed
      const needsMigration = users.some(u => !('role' in u));
      const migratedUsers = users.map(migrateUser);

      // If migration occurred, save the updated file
      if (needsMigration) {
        await saveUsers(migratedUsers);
      }
      return migratedUsers;
    }
    return [];
  } catch (error) {
    console.error("Failed to get or migrate users:", error);
    return [];
  }
}

export async function saveUsers(users: StoredUser[]): Promise<{success: boolean, error?: string}> {
  const client = getClient();
  try {
    await client.putFileContents(USERS_JSON_PATH, JSON.stringify(users, null, 2));
    await notifyClients({ type: 'users', payload: {} });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

const MAINTENANCE_JSON_PATH = '/maintenance.json';
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
    await notifyClients({ type: 'maintenance', payload: {} });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

'use server';

import { supabase } from '@/lib/supabase/client';
import type { ImageFile, SystemSettings, StoredUser } from '@/types';
import Ably from 'ably';
import { createClient as createWebDAVClient } from 'webdav';
import { webdavConfig } from '@/config/webdav';

const ABLY_API_KEY = process.env.ABLY_API_KEY;
const ABLY_CHANNEL_NAME = 'hubqueue:updates';

// --- Helper Functions ---

function getProxiedUrl(webdavPath: string): string {
    // The URL is now a local API route that proxies the image from WebDAV.
    // This keeps the WebDAV server and credentials secure on the server side.
    return `/api/image?path=${encodeURIComponent(webdavPath)}`;
}

// --- Ably Notifications ---

async function notifyQueueUpdate() {
    if (!ABLY_API_KEY) return;
    try {
        const [images, history] = await Promise.all([getImageList(), getHistoryList()]);

        const ably = new Ably.Rest(ABLY_API_KEY);
        const channel = ably.channels.get(ABLY_CHANNEL_NAME);
        await channel.publish('queue_updated', { images, history });
    } catch (error) {
        console.error('Failed to notify Ably with queue update:', error);
    }
}

async function notifySystemUpdate() {
    if (!ABLY_API_KEY) return;
    try {
        const ably = new Ably.Rest(ABLY_API_KEY);
        const channel = ably.channels.get(ABLY_CHANNEL_NAME);
        await channel.publish('system_updated', {});
    } catch (error) {
        console.error('Failed to notify Ably with system update:', error);
    }
}

// --- Data Functions ---

export async function getUsers(): Promise<StoredUser[]> {
    const { data, error } = await supabase.from('users').select('*');
    if (error) {
        console.error('Error fetching users:', error);
        return [];
    }
    return data || [];
}

export async function saveUsers(users: StoredUser[]): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.from('users').upsert(users, { onConflict: 'username' });

    if (error) {
        console.error('Error saving users:', error);
        return { success: false, error: error.message };
    }
    await notifySystemUpdate();
    return { success: true };
}

export async function addUser(user: StoredUser): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.from('users').insert(user);
    if (error) {
        console.error('Error adding user:', error);
        return { success: false, error: error.message };
    }
    await notifySystemUpdate();
    return { success: true };
}

export async function getImageList(): Promise<ImageFile[]> {
    const { data, error } = await supabase
        .from('images')
        .select('*')
        .order('createdAt', { ascending: false });

    if (error) {
        console.error('Error fetching image list:', error);
        return [];
    }
    return (data || []).map(img => ({
        ...img,
        url: getProxiedUrl(img.webdavPath)
    }));
}

export async function addImage(image: Omit<ImageFile, 'id' | 'url'>): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.from('images').insert({
        ...image,
        webdavPath: image.webdavPath,
        uploadedBy: image.uploadedBy,
        createdAt: image.createdAt,
    });
    if (error) {
        console.error('Error adding image:', error);
        return { success: false, error: error.message };
    }
    await notifyQueueUpdate();
    return { success: true };
}

export async function updateImage(image: ImageFile): Promise<{ success: boolean; error?: string }> {
    if (image.status === 'completed') {
        const { error } = await supabase.rpc('move_to_history', {
            target_id: image.id,
            completed_by: image.completedBy,
            completed_at: image.completedAt,
            completion_notes: image.completionNotes
        });

        if (error) {
            console.error('Error moving image to history:', error);
            return { success: false, error: error.message };
        }
    } else {
        const { id, url, ...updateData } = image;
        const { error } = await supabase.from('images').update(updateData).eq('id', id);
        if (error) {
            console.error('Error updating image:', error);
            return { success: false, error: error.message };
        }
    }

    await notifyQueueUpdate();
    return { success: true };
}

export async function deleteImage(id: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.from('images').delete().eq('id', id);
    if (error) {
        console.error('Error deleting image:', error);
        return { success: false, error: error.message };
    }
    await notifyQueueUpdate();
    return { success: true };
}

export async function getHistoryList(): Promise<ImageFile[]> {
    const { data, error } = await supabase
        .from('history')
        .select('*')
        .order('completedAt', { ascending: false });

    if (error) {
        console.error('Error fetching history list:', error);
        return [];
    }
    return (data || []).map(img => ({
        ...img,
        url: getProxiedUrl(img.webdavPath)
    }));
}

export async function getSystemSettings(): Promise<SystemSettings> {
    const { data, error } = await supabase.from('system_settings').select('value').eq('key', 'settings');
    const defaultSettings: SystemSettings = { isMaintenance: false, selfDestructDays: 5 };

    if (error || !data || data.length === 0) {
        console.error('Could not fetch system settings, returning default.', error);
        return defaultSettings;
    }
    return { ...defaultSettings, ...(data[0].value as object) };
}

export async function saveSystemSettings(settings: SystemSettings): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
        .from('system_settings')
        .upsert({ key: 'settings', value: settings }, { onConflict: 'key' });

    if (error) {
        console.error('Error saving system settings:', error);
        return { success: false, error: error.message };
    }
    await notifySystemUpdate();
    return { success: true };
}

export async function uploadToWebdav(fileName: string, dataUrl: string): Promise<{ success: boolean, path?: string, error?: string }> {
    if (!webdavConfig.url || !webdavConfig.username || !webdavConfig.password) {
        return { success: false, error: 'WebDAV configuration is incomplete on the server.' };
    }
    
    try {
        const client = createWebDAVClient(webdavConfig.url, {
            username: webdavConfig.username,
            password: webdavConfig.password,
        });

        const buffer = Buffer.from(dataUrl.split(',')[1], 'base64');
        const remotePath = `/uploads/${fileName}`;

        await client.putFileContents(remotePath, buffer, { overwrite: true });

        return { success: true, path: remotePath };
    } catch (error: any) {
        console.error('Failed to upload to WebDAV', error);
        return { success: false, error: error.message || 'An unknown error occurred during upload.' };
    }
}

export async function checkSelfDestructStatus(): Promise<{ selfDestruct: boolean }> {
    const lastTime = await getLastUploadTime();
    if (lastTime === null) {
        return { selfDestruct: false };
    }
    const settings = await getSystemSettings();
    const selfDestructDays = settings.selfDestructDays || 5;

    const deadline = Date.now() - (selfDestructDays * 24 * 60 * 60 * 1000);
    return { selfDestruct: lastTime < deadline };
}

export async function getLastUploadTime(): Promise<number | null> {
    const { data, error } = await supabase.rpc('get_last_activity_timestamp');

    if (error) {
        console.error('Error fetching last activity timestamp:', error);
        return null;
    }
    
    return data ? data : null;
}

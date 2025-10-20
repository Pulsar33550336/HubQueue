

'use server';

import { supabase } from '@/lib/supabase/client';
import type { ImageFile, SystemSettings, StoredUser } from '@/types';
import Ably from 'ably';
import { createClient as createWebDAVClient } from 'webdav';
import { webdavConfig } from '@/config/webdav';

const ABLY_API_KEY = process.env.ABLY_API_KEY;
const ABLY_CHANNEL_NAME = 'hubqueue:updates';

// This function constructs the proxied URL for an image.
function getProxiedUrl(webdavPath: string): string {
    return `/api/image?path=${encodeURIComponent(webdavPath)}`;
}

// --- Helper Functions ---

function convertToImageFile(img: any): ImageFile {
    const convertedImg: any = {};

    // Copy all properties from the source object
    for (const key in img) {
        if (img.hasOwnProperty(key)) {
            convertedImg[key] = img[key];
        }
    }
    
    if (img.webdavPath) {
        convertedImg.url = getProxiedUrl(img.webdavPath);
    }

    // Ensure timestamps, which come as ISO strings from DB, are converted to numbers for the frontend
    if (img.createdAt && typeof img.createdAt === 'string') {
      convertedImg.createdAt = new Date(img.createdAt).getTime();
    }
    if (img.claimedAt && typeof img.claimedAt === 'string') {
        convertedImg.claimedAt = new Date(img.claimedAt).getTime();
    }
    if (img.completedAt && typeof img.completedAt === 'string') {
        convertedImg.completedAt = new Date(img.completedAt).getTime();
    }
    
    return convertedImg as ImageFile;
}


// --- Ably Notifications ---

async function notifyAbly(name: string, data: any) {
    if (!ABLY_API_KEY) {
        console.log("Ably API key not configured, skipping notification.");
        return;
    }
    try {
        const ably = new Ably.Rest(ABLY_API_KEY);
        const channel = ably.channels.get(ABLY_CHANNEL_NAME);
        await channel.publish(name, data);
    } catch (error) {
        console.error(`Failed to notify Ably with event '${name}':`, error);
    }
}


export async function notifyQueueUpdate(updated_id?: string) {
    const [imagesResult, historyResult] = await Promise.all([getImageList(), getHistoryList()]);
    // We only notify with the data, even if there were partial errors.
    await notifyAbly('queue_updated', { 
        images: imagesResult.data || [], 
        history: historyResult.data || [], 
        updated_id 
    });
}

async function notifySystemUpdate() {
    await notifyAbly('system_updated', {});
}


// --- Data Functions ---
// --- DB functions now return { data, error } object for better error handling ---

export async function getUsers(): Promise<{ data: StoredUser[] | null, error: string | null }> {
    try {
        const { data, error } = await supabase.from('users').select('*');
        if (error) throw error;
        return { data: data.map(u => ({ username: u.username, passwordHash: u.passwordHash, role: u.role })), error: null };
    } catch (e: any) {
        return { data: null, error: e.message };
    }
}

export async function saveUsers(users: StoredUser[]): Promise<{ data: any, error: string | null }> {
    try {
        const usersToUpsert = users.map(u => ({
            username: u.username,
            passwordHash: u.passwordHash,
            role: u.role,
        }));
        const { data, error } = await supabase.from('users').upsert(usersToUpsert, { onConflict: 'username' });

        if (error) throw error;
        await notifySystemUpdate();
        return { data, error: null };
    } catch (e: any) {
        return { data: null, error: e.message };
    }
}

export async function addUser(user: StoredUser): Promise<{ data: StoredUser | null, error: string | null }> {
    try {
        const { data, error } = await supabase.from('users').insert({
          username: user.username,
          passwordHash: user.passwordHash,
          role: user.role,
        }).select().single();

        if (error) throw error;
        await notifySystemUpdate();
        return { data, error: null };
    } catch (e: any) {
        return { data: null, error: e.message };
    }
}

export async function getImageList(): Promise<{ data: ImageFile[] | null, error: string | null }> {
    try {
        const { data, error } = await supabase
            .from('images')
            .select('*')
            .order('createdAt', { ascending: false });

        if (error) throw error;
        return { data: (data || []).map(convertToImageFile), error: null };
    } catch(e: any) {
        return { data: null, error: e.message };
    }
}

export async function addImage(image: Omit<ImageFile, 'id' | 'url'>): Promise<{ data: { id: string } | null, error: string | null }> {
    try {
        const imageToInsert = {
            name: image.name,
            webdavPath: image.webdavPath,
            status: image.status,
            uploadedBy: image.uploadedBy,
            createdAt: new Date(image.createdAt).toISOString(),
        };

        const { data, error } = await supabase.from('images').insert(imageToInsert).select('id').single();

        if (error) throw error;
        await notifyQueueUpdate(data.id);
        return { data: {id: data.id}, error: null };
    } catch(e: any) {
        return { data: null, error: e.message };
    }
}

export async function updateImage(image: ImageFile): Promise<{ data: any, error: string | null }> {
    try {
        if (image.status === 'completed') {
            const { data: imageToMove, error: fetchError } = await supabase
                .from('images')
                .select('*')
                .eq('id', image.id)
                .single();
            
            if (fetchError || !imageToMove) {
                throw new Error(fetchError?.message || 'Could not find the image to complete.');
            }

            const historyData = {
                id: imageToMove.id,
                name: imageToMove.name,
                webdavPath: imageToMove.webdavPath,
                status: 'completed',
                uploadedBy: imageToMove.uploadedBy,
                createdAt: imageToMove.createdAt,
                claimedAt: imageToMove.claimedAt, 
                completedBy: image.completedBy,
                completedAt: image.completedAt ? new Date(image.completedAt).toISOString() : null,
                completionNotes: image.completionNotes,
            };

            const { error: insertError } = await supabase.from('history').insert(historyData);
            if (insertError) throw insertError;

            const { error: deleteError } = await supabase.from('images').delete().eq('id', image.id);
            if (deleteError) throw deleteError;
            
        } else { // Handle 'claimed' or 'unclaimed' status updates
            const imageToUpdate: Record<string, any> = {
                status: image.status,
                claimedBy: image.claimedBy,
                claimedAt: image.claimedAt ? new Date(image.claimedAt).toISOString() : null,
            };

            for (const key in imageToUpdate) {
                if (imageToUpdate[key] === undefined) {
                    imageToUpdate[key] = null;
                }
            }

            const { data, error } = await supabase.from('images').update(imageToUpdate).eq('id', image.id);
            if (error) throw error;
        }

        await notifyQueueUpdate(image.id);
        return { data: { success: true }, error: null };
    } catch (e: any) {
        return { data: null, error: e.message };
    }
}


export async function deleteImage(id: string): Promise<{ data: any, error: string | null }> {
    try {
        const { error: imageDeleteError } = await supabase.from('images').delete().eq('id', id);
        if (imageDeleteError && imageDeleteError.code !== 'PGRST116') throw imageDeleteError;

        const { error: historyDeleteError } = await supabase.from('history').delete().eq('id', id);
        if (historyDeleteError && historyDeleteError.code !== 'PGRST116') throw historyDeleteError;

        await notifyQueueUpdate(id);
        return { data: { success: true }, error: null };
    } catch(e: any) {
        return { data: null, error: e.message };
    }
}


export async function getHistoryList(): Promise<{ data: ImageFile[] | null, error: string | null }> {
    try {
        const { data, error } = await supabase
            .from('history')
            .select('*')
            .order('completedAt', { ascending: false });

        if (error) throw error;
        return { data: (data || []).map(convertToImageFile), error: null };
    } catch(e: any) {
        return { data: null, error: e.message };
    }
}

export async function getSystemSettings(): Promise<{ data: SystemSettings | null, error: string | null }> {
    const defaultSettings: SystemSettings = { isMaintenance: false, selfDestructDays: 5 };
    try {
        const { data, error } = await supabase.from('system_settings').select('value').eq('key', 'settings').single();
        if (error) {
           if (error.code === 'PGRST116') { // Not found, return default
              return { data: defaultSettings, error: null };
           }
           throw error;
        }
        return { data: { ...defaultSettings, ...(data.value as object) }, error: null };
    } catch(e: any) {
        return { data: null, error: e.message };
    }
}

export async function saveSystemSettings(settings: SystemSettings): Promise<{ data: any, error: string | null }> {
    try {
        const { data, error } = await supabase
            .from('system_settings')
            .upsert({ key: 'settings', value: settings }, { onConflict: 'key' });

        if (error) throw error;
        await notifySystemUpdate();
        return { data, error: null };
    } catch (e: any) {
        return { data: null, error: e.message };
    }
}

export async function uploadToWebdav(fileName: string, dataUrl: string): Promise<{ success: boolean, path?: string, error?: string }> {
    if (!webdavConfig.url || !webdavConfig.username || !webdavConfig.password) {
        const errorMsg = 'WebDAV configuration is incomplete on the server.';
        return { success: false, error: errorMsg };
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
        return { success: false, error: error.message || 'An unknown error occurred during upload.' };
    }
}

export async function checkSelfDestructStatus(): Promise<{ data: { selfDestruct: boolean } | null, error: string | null }> {
    try {
        const { data: lastTime, error: lastTimeError } = await getLastUploadTime();
        if (lastTimeError) throw new Error(lastTimeError);

        if (lastTime === null) {
            return { data: { selfDestruct: false }, error: null };
        }

        const { data: settings, error: settingsError } = await getSystemSettings();
        if (settingsError || !settings) throw new Error(settingsError || "Could not retrieve system settings");
        
        const selfDestructDays = settings.selfDestructDays || 5;
        const deadline = Date.now() - (selfDestructDays * 24 * 60 * 60 * 1000);

        return { data: { selfDestruct: lastTime < deadline }, error: null };
    } catch (e: any) {
        return { data: null, error: e.message };
    }
}

export async function getLastUploadTime(): Promise<{ data: number | null, error: string | null }> {
    try {
        const { data: lastImage, error: imageError } = await supabase
            .from('images')
            .select('createdAt')
            .order('createdAt', { ascending: false })
            .limit(1)
            .single();

        const { data: lastHistory, error: historyError } = await supabase
            .from('history')
            .select('completedAt')
            .order('completedAt', { ascending: false })
            .limit(1)
            .single();
        
        if (imageError && imageError.code !== 'PGRST116') { // PGRST116: "exact one row not found"
            console.error('Error fetching last image timestamp:', imageError);
        }
        if (historyError && historyError.code !== 'PGRST116') {
            console.error('Error fetching last history timestamp:', historyError);
        }
        
        const lastImageTime = lastImage?.createdAt ? new Date(lastImage.createdAt).getTime() : 0;
        const lastHistoryTime = lastHistory?.completedAt ? new Date(lastHistory.completedAt).getTime() : 0;

        const mostRecentTime = Math.max(lastImageTime, lastHistoryTime);

        return { data: mostRecentTime > 0 ? mostRecentTime : null, error: null };
    } catch(e: any) {
        return { data: null, error: e.message };
    }
}

    
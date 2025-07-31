
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { ImageFile } from '@/types';
import { ImageUploader } from './image-uploader';
import { ImageQueue } from './image-queue';
import { useToast } from "@/hooks/use-toast";
import { getImageList, getHistoryList, addImage, updateImage, deleteImage } from '@/services/webdav';
import { Skeleton } from './ui/skeleton';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getSoundPreference, getNotificationPreference } from '@/lib/preferences';
import Ably from 'ably';


export default function Dashboard() {
  const { user } = useAuth();
  const [images, setImages] = useState<ImageFile[]>([]);
  const [history, setHistory] = useState<ImageFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();
  
  const imagesRef = useRef(images);
  imagesRef.current = images;

  const ablyRef = useRef<Ably.Realtime | null>(null);

  const fetchInitialData = useCallback(async () => {
    // We don't want the main loading state for background refreshes
    // setIsLoading(true); 
    try {
      const [imageList, historyList] = await Promise.all([getImageList(), getHistoryList()]);
      const migratedImageList = imageList.map(img => ({ ...img, uploadedBy: img.uploadedBy || 'unknown' }));
      setImages(migratedImageList);
      setHistory(historyList);
    } catch (error: any) {
       toast({
        variant: "destructive",
        title: "无法加载图片列表",
        description: error.message || "无法连接到数据库。",
      });
    } finally {
        if (isLoading) {
            setIsLoading(false);
        }
    }
  }, [toast, isLoading]);
  
  useEffect(() => {
    fetchInitialData();

    // Set up periodic refresh as a fallback
    const intervalId = setInterval(fetchInitialData, 60000); // Refresh every 60 seconds

    if (!ablyRef.current) {
      ablyRef.current = new Ably.Realtime({ authUrl: '/api/ably-auth' });
      ablyRef.current.connection.on('connected', () => {
        console.log('Connected to Ably!');
      });

      const channel = ablyRef.current.channels.get('hubqueue:updates');
      
      channel.subscribe((message) => {
        const { name, data } = message;
        console.log(`Received Ably message: ${name}`, data);

        if (name === 'queue_updated') {
            const { images: newImages, history: newHistory } = data;
            const hadImageAdded = newImages.length > imagesRef.current.length;
            
            setImages(newImages);
            setHistory(newHistory);
            
            if (hadImageAdded) {
                 if (getNotificationPreference()) {
                    toast({
                        title: '有新图片加入队列',
                        description: `新图片: ${newImages[0].name}`,
                    });
                }
                if (getSoundPreference()) {
                    new Audio('/notification.mp3').play().catch(() => {});
                }
            }
        } else if (name === 'system_updated') {
            // A simple way to react to broad changes is to refetch all data
            // This could be optimized to be more granular
            fetchInitialData();
        }
      });
    }

    return () => {
        clearInterval(intervalId);
        // We don't close the Ably connection here to keep it alive across SPA navigations.
        // The browser will handle closing the connection on page exit.
    };
  }, [fetchInitialData]);
  
  const handleClaimImage = async (id: string) => {
    if (!user) {
        toast({
            variant: "destructive",
            title: "认证错误",
            description: "您必须登录才能认领任务。",
        });
        return;
    }

    const originalImages = [...images];
    const imageToClaim = images.find(img => img.id === id);

    if (!imageToClaim || imageToClaim.status !== 'uploaded') {
        toast({
            variant: "destructive",
            title: "操作失败",
            description: "该任务可能已被其他用户认领。"
        });
        return;
    }

    setIsSyncing(true);
    const updatedImage = { ...imageToClaim, status: 'in-progress', claimedBy: user.username } as ImageFile;
    // Optimistic UI update
    setImages(prev => prev.map(img => img.id === id ? updatedImage : img));

    try {
      const { success, error } = await updateImage(updatedImage);
      if (!success) {
        throw new Error(error || "无法保存更新后的图片列表。");
      }
    } catch (error: any) {
       toast({
        variant: "destructive",
        title: "同步错误",
        description: error.message || "无法认领任务。",
      });
      setImages(originalImages); // Rollback UI on error
    } finally {
        setIsSyncing(false);
    }
  };
  
  const handleUnclaimImage = async (id: string) => {
    if (!user) return;
    
    const originalImages = [...images];
    const imageToUnclaim = images.find(img => img.id === id);

    if (!imageToUnclaim || !(imageToUnclaim.claimedBy === user.username || user.isAdmin)) {
         toast({
          variant: "destructive",
          title: "操作失败",
          description: "您没有权限放回此任务。",
        });
        return;
    }

    setIsSyncing(true);
    const updatedImage = { ...imageToUnclaim, status: 'uploaded', claimedBy: undefined } as ImageFile;
    setImages(prev => prev.map(img => img.id === id ? updatedImage : img));

    try {
      const { success, error } = await updateImage(updatedImage);
      if (!success) {
        throw new Error(error || "无法保存更新后的图片列表。");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "同步错误",
        description: error.message || "无法放回任务。",
      });
      setImages(originalImages);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImageUploaded = async (uploadedImage: { name: string, webdavPath: string }) => {
    if (!user) {
        toast({
            variant: "destructive",
            title: "认证错误",
            description: "您必须登录才能上传图片。",
        });
        return;
    }
    setIsSyncing(true);
    try {
        const newImage: Omit<ImageFile, 'url'> = {
            id: Math.random().toString(36).substring(2, 9),
            name: uploadedImage.name,
            webdavPath: uploadedImage.webdavPath,
            status: 'uploaded',
            uploadedBy: user.username,
            createdAt: Date.now(),
        };

        const { success, error } = await addImage(newImage);
        if (!success) {
            throw new Error(error || '无法将图片保存到数据库。');
        }
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "同步失败",
            description: error.message,
        });
    } finally {
        setIsSyncing(false);
    }
  };
  
  const handleCompleteImage = async (id: string, notes: string) => {
    if (!user) return;

    const originalImages = [...images];
    const imageToComplete = images.find(img => img.id === id);
    if (!imageToComplete) {
        toast({ variant: "destructive", title: "错误", description: "找不到要完成的任务。" });
        return;
    }

    setIsSyncing(true);
    const completedImage: ImageFile = {
        ...imageToComplete,
        status: 'completed',
        completedBy: user.username,
        completedAt: Date.now(),
        completionNotes: notes,
    };
    
    // UI update is now handled by Ably broadcast, but we can do a preemptive update for responsiveness
    setImages(prev => prev.filter(img => img.id !== id));
    setHistory(prev => [completedImage, ...prev]);

    try {
      const { success, error } = await updateImage(completedImage);
      if (!success) {
        throw new Error(error || "无法更新列表。");
      }
    } catch (error: any) {
         toast({
            variant: "destructive",
            title: "操作失败",
            description: error.message,
        });
        // Rollback optimistic update
        setImages(originalImages);
        fetchInitialData(); // Refetch to be safe
    } finally {
        setIsSyncing(false);
    }
  };

  const handleDeleteImage = async (id: string) => {
    const originalImages = [...images];
    const imageToDelete = images.find(img => img.id === id);
    if (!imageToDelete) {
      toast({ variant: "destructive", title: "错误", description: "找不到要删除的记录。" });
      return;
    }

    setIsSyncing(true);
    // Optimistic UI update
    setImages(prev => prev.filter(img => img.id !== id));
    
    try {
      const { success, error } = await deleteImage(id);

      if (!success) {
        throw new Error(error || "无法更新图片列表。");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "删除失败",
        description: error.message,
      });
       setImages(originalImages);
    } finally {
      setIsSyncing(false);
    }
  };
  
  const handleUploadFromQueue = (id: string) => {
      console.log("此操作已弃用，因为图片在加入队列前就已上传。", id)
  }

  const activeImages = images.filter(img => img.status !== 'completed');
  
  const queueStats = useMemo(() => {
    const totalUploaded = images.length + history.length;
    const totalCompleted = history.length;
    const userUploaded = user ? (images.filter(img => img.uploadedBy === user.username).length + history.filter(img => img.uploadedBy === user.username).length) : 0;
    const userCompleted = user ? history.filter(img => img.completedBy === user.username).length : 0;
    return { totalUploaded, totalCompleted, userUploaded, userCompleted };
  }, [images, history, user]);

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <ImageUploader onImageUploaded={handleImageUploaded} />
      {isLoading ? (
        <div className="mt-8">
            <div className="flex justify-between items-center mb-6">
                <Skeleton className="h-8 w-48" />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>加载中...</span>
                </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="space-y-4">
                        <Skeleton className="h-40 w-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-5/6" />
                            <Skeleton className="h-8 w-full" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
      ) : (
        <ImageQueue
          images={activeImages}
          stats={queueStats}
          onClaim={handleClaimImage}
          onUnclaim={handleUnclaimImage}
          onUpload={handleUploadFromQueue}
          onComplete={handleCompleteImage}
          onDelete={handleDeleteImage}
          isSyncing={isSyncing}
        />
      )}
    </div>
  );
}

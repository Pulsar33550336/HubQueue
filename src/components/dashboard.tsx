
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ImageFile } from '@/types';
import { ImageUploader } from './image-uploader';
import { ImageQueue } from './image-queue';
import { useToast } from "@/hooks/use-toast";
import { getImageList, saveImageList, uploadToWebdav, deleteWebdavFile } from '@/services/webdav';
import { Skeleton } from './ui/skeleton';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getSoundPreference, getNotificationPreference } from '@/lib/preferences';


const POLLING_INTERVAL = 5000; // 5 seconds

export default function Dashboard() {
  const { user } = useAuth();
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();
  
  const imagesRef = useRef(images);
  imagesRef.current = images;

  const isInitialLoad = useRef(true);

  const fetchImages = useCallback(async (showSyncingIndicator = false) => {
    if (showSyncingIndicator) {
      setIsSyncing(true);
    }
    try {
      const imageList = await getImageList();
      const migratedImageList = imageList.map(img => ({ ...img, uploadedBy: img.uploadedBy || 'unknown' }));
      
      if (document.visibilityState === 'visible') {
        const oldImageIds = new Set(imagesRef.current.map(img => img.id));
        const newImages = migratedImageList.filter(img => !oldImageIds.has(img.id));
        
        if (newImages.length > 0 && !isInitialLoad.current) {
          const newImageNames = newImages.map(img => img.name).join(', ');
          
          if (getNotificationPreference()) {
            toast({
              title: '有新图片加入队列',
              description: `新图片: ${newImageNames}`,
            });
          }
          
          if (getSoundPreference()) {
            const audio = new Audio('/notification.mp3');
            audio.play().catch(error => {
              // Gracefully handle cases where the sound file might not exist or fails to play.
              // This prevents console errors for the user.
            });
          }
        }
      }

      if (JSON.stringify(migratedImageList) !== JSON.stringify(imagesRef.current)) {
        setImages(migratedImageList);
      }
    } catch (error: any) {
      if (showSyncingIndicator) {
          toast({
            variant: "destructive",
            title: "无法加载图片列表",
            description: error.message || "无法连接到 WebDAV。",
          });
      }
      console.error("Polling failed:", error);
    } finally {
      if (showSyncingIndicator) {
        setIsSyncing(false);
      }
    }
  }, [toast]);

  useEffect(() => {
    const initialFetch = async () => {
      setIsLoading(true);
      await fetchImages(false);
      isInitialLoad.current = false;
      setIsLoading(false);
    };
    initialFetch();
  }, [fetchImages]);
  
  useEffect(() => {
    const interval = setInterval(() => {
        fetchImages(true);
    }, POLLING_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchImages]);

  const handleClaimImage = async (id: string) => {
    if (!user) {
        toast({
            variant: "destructive",
            title: "认证错误",
            description: "您必须登录才能认领任务。",
        });
        return;
    }

    setIsSyncing(true);
    try {
      const currentImages = await getImageList();
      const imageToClaim = currentImages.find(img => img.id === id);

      if (imageToClaim && imageToClaim.status === 'uploaded') {
        const updatedImages = currentImages.map(img => 
          img.id === id ? { ...img, status: 'in-progress', claimedBy: user.username } : img
        );
        
        const { success, error } = await saveImageList(updatedImages);
        
        if (success) {
          setImages(updatedImages.map(img => ({ ...img, uploadedBy: img.uploadedBy || 'unknown' })));
          toast({
            title: "任务已认领",
            description: `您已认领 ${imageToClaim.name}。`
          });
        } else {
          throw new Error(error || "无法保存更新后的图片列表。");
        }
      } else {
         toast({
            variant: "destructive",
            title: "操作失败",
            description: "该任务可能已被其他用户认领。"
        });
        await fetchImages(false);
      }
    } catch (error: any) {
       toast({
        variant: "destructive",
        title: "同步错误",
        description: error.message || "无法认领任务。",
      });
      await fetchImages(false);
    } finally {
        setIsSyncing(false);
    }
  };
  
  const handleUnclaimImage = async (id: string) => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const currentImages = await getImageList();
      const imageToUnclaim = currentImages.find(img => img.id === id);

      if (imageToUnclaim && imageToUnclaim.claimedBy === user.username) {
        const updatedImages = currentImages.map(img =>
          img.id === id ? { ...img, status: 'uploaded', claimedBy: undefined } : img
        );

        const { success, error } = await saveImageList(updatedImages);

        if (success) {
          setImages(updatedImages.map(img => ({ ...img, uploadedBy: img.uploadedBy || 'unknown' })));
          toast({
            title: "任务已放回",
            description: `${imageToUnclaim.name} 已返回队列。`,
          });
        } else {
          throw new Error(error || "无法保存更新后的图片列表。");
        }
      } else {
        toast({
          variant: "destructive",
          title: "操作失败",
          description: "您无法放回不属于您的任务。",
        });
        setImages(currentImages.map(img => ({ ...img, uploadedBy: img.uploadedBy || 'unknown' })));
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "同步错误",
        description: error.message || "无法放回任务。",
      });
      await fetchImages(false);
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
        const newImage: ImageFile = {
            id: Math.random().toString(36).substring(2, 9),
            name: uploadedImage.name,
            webdavPath: uploadedImage.webdavPath,
            url: `/api/image?path=${encodeURIComponent(uploadedImage.webdavPath)}`,
            status: 'uploaded',
            uploadedBy: user.username,
            createdAt: Date.now(),
        };

        const currentImages = await getImageList();
        const updatedImages = [newImage, ...currentImages];

        const { success, error } = await saveImageList(updatedImages);
        if (success) {
            setImages(updatedImages.map(img => ({ ...img, uploadedBy: img.uploadedBy || 'unknown' })));
            toast({
                title: "上传成功",
                description: `${newImage.name} 已被添加到队列。`
            });
        } else {
            throw new Error(error || '无法将图片列表保存到 WebDAV。');
        }
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "同步失败",
            description: error.message,
        });
        await fetchImages(false);
    } finally {
        setIsSyncing(false);
    }
  };
  
  const handleDeleteImage = async (id: string) => {
    const imageToDelete = images.find(img => img.id === id);
    if (!imageToDelete) return;

    setIsSyncing(true);

    try {
        const { success: deleteSuccess, error: deleteError } = await deleteWebdavFile(imageToDelete.webdavPath);
        if (!deleteSuccess) {
            throw new Error(deleteError || `无法从存储中删除文件。`);
        }

        const currentImages = await getImageList();
        const updatedImages = currentImages.filter(img => img.id !== id);

        const { success: saveSuccess, error: saveError } = await saveImageList(updatedImages);
        if(saveSuccess) {
            setImages(updatedImages.map(img => ({ ...img, uploadedBy: img.uploadedBy || 'unknown' })));
            toast({
                title: "图片已删除",
                description: `${imageToDelete.name} 已被移除。`,
            });
        } else {
            throw new Error(saveError || "无法更新图片列表。");
        }
    } catch (error: any) {
         toast({
            variant: "destructive",
            title: "删除失败",
            description: error.message,
        });
        await fetchImages(false);
    } finally {
        setIsSyncing(false);
    }
  };
  
  const handleUploadFromQueue = (id: string) => {
      console.log("此操作已弃用，因为图片在加入队列前就已上传。", id)
  }

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
          images={images}
          onClaim={handleClaimImage}
          onUnclaim={handleUnclaimImage}
          onUpload={handleUploadFromQueue}
          onDelete={handleDeleteImage}
          isSyncing={isSyncing}
        />
      )}
    </div>
  );
}

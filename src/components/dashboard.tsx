
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { ImageFile } from '@/types';
import { ImageUploader } from './image-uploader';
import { ImageQueue } from './image-queue';
import { useToast } from "@/hooks/use-toast";
import { getImageList, getHistoryList, addImage, updateImage, deleteImage, uploadToWebdav, notifyQueueUpdate } from '@/services/db';
import { Skeleton } from './ui/skeleton';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getSoundPreference, getNotificationPreference } from '@/lib/preferences';
import Ably from 'ably';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { format } from 'date-fns';


function SelfDestructTimer() {
  const { lastUploadTime, settings } = useAuth();
  const [timeLeft, setTimeLeft] = useState('');
  const [urgency, setUrgency] = useState('normal'); // 'normal', 'warning', 'danger'
  const [progress, setProgress] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);

  const selfDestructDays = settings?.selfDestructDays ?? 5;
  const selfDestructMillis = selfDestructDays * 24 * 60 * 60 * 1000;

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      
      if (lastUploadTime === null) {
        setTimeLeft(`${String(selfDestructDays).padStart(2, '0')}:00:00:00`);
        setUrgency('normal');
        setProgress(0);
        setStartTime(null);
        setEndTime(now + selfDestructMillis);
        return;
      }
      
      const deadline = lastUploadTime + selfDestructMillis;

      setStartTime(lastUploadTime);
      setEndTime(deadline);
      
      const remaining = deadline - now;
      
      if (remaining > selfDestructMillis) {
         setTimeLeft(`${String(selfDestructDays).padStart(2, '0')}:00:00:00`);
         setUrgency('normal');
         setProgress(0);
         return;
      }

      if (remaining <= 0) {
        setTimeLeft('00:00:00:00');
        setUrgency('danger');
        setProgress(100);
        return;
      }
      
      const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
      const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      setTimeLeft(
        `${String(days).padStart(2, '0')}:${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
      
      const totalDuration = deadline - lastUploadTime;
      const elapsed = now - lastUploadTime;
      const currentProgress = Math.min(100, (elapsed / totalDuration) * 100);
      setProgress(currentProgress);

      // Urgency based on percentage of time passed, more flexible than hardcoded days
      if (currentProgress > 80) {
        setUrgency('danger');
      } else if (currentProgress > 50) {
        setUrgency('warning');
      } else {
        setUrgency('normal');
      }
    };
    
    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);

    return () => clearInterval(timerInterval);
  }, [lastUploadTime, selfDestructDays, selfDestructMillis]);

  const urgencyStyles = {
    normal: 'text-primary',
    warning: 'text-yellow-500',
    danger: 'text-destructive animate-pulse',
  };

  const formattedStartTime = startTime ? format(new Date(startTime), 'yyyy-MM-dd HH:mm') : 'N/A';
  const formattedEndTime = endTime ? format(new Date(endTime), 'yyyy-MM-dd HH:mm') : '计算中...';


  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">系统自毁倒计时</CardTitle>
        <AlertTriangle className={`h-4 w-4 ${urgencyStyles[urgency]}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${urgencyStyles[urgency]}`}>
            {timeLeft || '计算中...'}
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          若连续{selfDestructDays}天无新活动，系统将自毁。
        </p>
        <Progress value={progress} className="w-full h-2 mb-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
            <span>最后活跃: {formattedStartTime}</span>
            <span>预计自毁: {formattedEndTime}</span>
        </div>
      </CardContent>
    </Card>
  );
}


export default function Dashboard() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [images, setImages] = useState<ImageFile[]>([]);
  const [history, setHistory] = useState<ImageFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();
  
  const imagesRef = useRef(images);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  const ablyRef = useRef<Ably.Realtime | null>(null);

  const fetchInitialData = useCallback(async () => {
    try {
      const [imagesResult, historyResult] = await Promise.all([getImageList(), getHistoryList()]);
      
      if (imagesResult.error) {
        throw new Error(imagesResult.error);
      }
      if (historyResult.error) {
        throw new Error(historyResult.error);
      }

      setImages(imagesResult.data || []);
      setHistory(historyResult.data || []);

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

        if (name === 'queue_updated') {
            const { images: newImages, history: newHistory, updated_id } = data;
            
            const hadImageAdded = newImages.length > imagesRef.current.length && !imagesRef.current.some(img => img.id === updated_id);

            setImages(newImages);
            setHistory(newHistory);
            
            if (hadImageAdded) {
                 if (getNotificationPreference()) {
                    toast({
                        title: '有新图片加入队列',
                        description: `新图片: ${newImages.find(i => i.id === updated_id)?.name || '新图片'}`,
                    });
                }
                if (getSoundPreference()) {
                    new Audio('/notification.mp3').play().catch(() => {});
                }
            }
        } else if (name === 'system_updated') {
            fetchInitialData();
        }
      });
    }

    return () => {
        clearInterval(intervalId);
    };
  }, [fetchInitialData, toast]);
  
  const handleClaimImage = async (id: string) => {
    if (!user) {
        toast({
            variant: "destructive",
            title: "认证错误",
            description: "您必须登录才能认领任务。",
        });
        return;
    }

    const imageToClaim = images.find(img => img.id === id);
    if (!imageToClaim) return;
    
    setProcessingId(id);
    const updatedImage: ImageFile = { 
        ...imageToClaim, 
        status: 'in-progress', 
        claimedBy: user.username,
        claimedAt: Date.now()
    };

    try {
      await updateImage(updatedImage);
    } catch (error: any) {
       toast({
        variant: "destructive",
        title: "同步错误",
        description: error.message || "无法认领任务。",
      });
    } finally {
        setProcessingId(null);
    }
  };
  
  const handleUnclaimImage = async (id: string) => {
    if (!user) return;
    
    const imageToUnclaim = images.find(img => img.id === id);
    if (!imageToUnclaim) return;

    setProcessingId(id);
    const updatedImage: ImageFile = { ...imageToUnclaim, status: 'uploaded', claimedBy: undefined, claimedAt: undefined };

    try {
      await updateImage(updatedImage);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "同步错误",
        description: error.message || "无法放回任务。",
      });
    } finally {
      setProcessingId(null);
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
    setProcessingId(`upload-${uploadedImage.name}`);
    try {
        const newImage: Omit<ImageFile, 'id' | 'url'> = {
            name: uploadedImage.name,
            webdavPath: uploadedImage.webdavPath,
            status: 'uploaded',
            uploadedBy: user.username,
            createdAt: Date.now(),
        };

        const { error } = await addImage(newImage);
        if (error) {
            throw new Error(error);
        }
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "同步失败",
            description: error.message,
        });
    } finally {
        setProcessingId(null);
    }
  };
  
  const handleCompleteImage = async (id: string, notes: string) => {
    if (!user) return;

    const imageToComplete = images.find(img => img.id === id);
    if (!imageToComplete) {
        toast({ variant: "destructive", title: "错误", description: "找不到要完成的任务。" });
        return;
    }

    setProcessingId(id);
    const completedImage: ImageFile = {
        ...imageToComplete,
        status: 'completed',
        completedBy: user.username,
        completedAt: Date.now(),
        completionNotes: notes,
    };
    
    try {
      const { error } = await updateImage(completedImage);
      if (error) throw new Error(error);
      await notifyQueueUpdate(id);
    } catch (error: any) {
         toast({
            variant: "destructive",
            title: "操作失败",
            description: error.message,
        });
    } finally {
        setProcessingId(null);
    }
  };

  const handleDeleteImage = async (id: string) => {
    const imageToDelete = images.find(img => img.id === id) || history.find(img => img.id === id);
    if (!imageToDelete) {
      toast({ variant: "destructive", title: "错误", description: "找不到要删除的记录。" });
      return;
    }

    setProcessingId(id);
    
    try {
      const { error } = await deleteImage(id);
      if (error) throw new Error(error);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "删除失败",
        description: error.message,
      });
    } finally {
      setProcessingId(null);
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
      <SelfDestructTimer />
      <ImageUploader onImageUploaded={handleImageUploaded} uploadFunction={uploadToWebdav} />
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
          processingId={processingId}
        />
      )}
    </div>
  );
}

    
    
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { getSoundPreference, setSoundPreference, getNotificationPreference, setNotificationPreference } from '@/lib/preferences';
import { BellRing, BellOff, Volume2, VolumeX } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

export default function Settings() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setNotificationsEnabled(getNotificationPreference());
    setSoundEnabled(getSoundPreference());
  }, []);

  const handleNotificationToggle = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    setNotificationPreference(enabled);
  };

  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabled(enabled);
    setSoundPreference(enabled);
  };
  
  if (!isClient) {
     return (
       <div className="container mx-auto py-8 px-4 md:px-6">
        <Card>
            <CardHeader>
                <CardTitle>个人设置</CardTitle>
                <CardDescription>管理您的账户和应用偏好。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-6 w-6" />
                        <div>
                           <Skeleton className="h-5 w-32 mb-1" />
                           <Skeleton className="h-4 w-72" />
                        </div>
                    </div>
                    <Skeleton className="h-6 w-11" />
                </div>
                 <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-6 w-6" />
                        <div>
                           <Skeleton className="h-5 w-24 mb-1" />
                           <Skeleton className="h-4 w-72" />
                        </div>
                    </div>
                    <Skeleton className="h-6 w-11" />
                </div>
            </CardContent>
        </Card>
       </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
        <Card>
            <CardHeader>
                <CardTitle>个人设置</CardTitle>
                <CardDescription>管理您的账户和应用偏好。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                         {notificationsEnabled ? <BellRing className="h-6 w-6 text-primary" /> : <BellOff className="h-6 w-6 text-muted-foreground" />}
                        <div>
                            <Label htmlFor="toast-notification" className="font-semibold">新图片上传提醒</Label>
                            <p className="text-sm text-muted-foreground">当有新图片上传到队列时，接收弹窗提醒。</p>
                        </div>
                    </div>
                    <Switch
                        id="toast-notification"
                        checked={notificationsEnabled}
                        onCheckedChange={handleNotificationToggle}
                        aria-label="Toggle new image toast notifications"
                    />
                </div>
                 <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                         {soundEnabled ? <Volume2 className="h-6 w-6 text-primary" /> : <VolumeX className="h-6 w-6 text-muted-foreground" />}
                        <div>
                            <Label htmlFor="sound-notification" className="font-semibold">提醒音效</Label>
                            <p className="text-sm text-muted-foreground">当有新图片上传到队列时，播放音效提醒。</p>
                        </div>
                    </div>
                    <Switch
                        id="sound-notification"
                        checked={soundEnabled}
                        onCheckedChange={handleSoundToggle}
                        aria-label="Toggle new image sound notification"
                    />
                </div>
            </CardContent>
        </Card>
    </div>
  );
}

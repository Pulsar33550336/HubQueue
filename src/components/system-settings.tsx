
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { saveMaintenanceStatus } from '@/services/webdav';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import { Wrench } from 'lucide-react';
import { Label } from './ui/label';

export default function SystemSettings() {
  const { user, isMaintenanceMode, setMaintenanceMode, isLoading: isAuthLoading } = useAuth();
  const [updatingStates, setUpdatingStates] = useState<Record<string, boolean>>({});
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!isAuthLoading && (!user || !user.isAdmin)) {
      router.push('/dashboard');
    }
  }, [user, isAuthLoading, router]);

  const handleMaintenanceToggle = async (isMaintenance: boolean) => {
    setUpdatingStates(prev => ({ ...prev, maintenance: true }));
    setMaintenanceMode(isMaintenance);
    const { success, error } = await saveMaintenanceStatus({ isMaintenance });
     if (!success) {
        toast({
            variant: 'destructive',
            title: '操作失败',
            description: error || '无法更新维护状态。',
        });
        setMaintenanceMode(!isMaintenance);
    } else {
         toast({
            title: '操作成功',
            description: `网站维护模式已${isMaintenance ? '开启' : '关闭'}。`,
        });
    }
    setUpdatingStates(prev => ({ ...prev, maintenance: false }));
  }

  if (isAuthLoading) {
    return (
        <div className="container mx-auto py-8 px-4 md:px-6">
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>系统设置</CardTitle>
                    <CardDescription>管理整个应用程序的全局设置。</CardDescription>
                </CardHeader>
                <CardContent>
                   <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                            <Wrench className="h-6 w-6 text-muted-foreground" />
                            <div>
                               <Skeleton className="h-5 w-24 mb-1" />
                               <Skeleton className="h-4 w-64" />
                            </div>
                        </div>
                        <Skeleton className="h-6 w-11" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
  }

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
        <Card className="mb-8">
            <CardHeader>
                <CardTitle>系统设置</CardTitle>
                <CardDescription>管理整个应用程序的全局设置。</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                        <Wrench className="h-6 w-6 text-muted-foreground" />
                        <div>
                            <Label htmlFor="maintenance-mode" className="font-semibold">维护模式</Label>
                            <p className="text-sm text-muted-foreground">开启后，只有管理员可以访问网站。</p>
                        </div>
                    </div>
                    <Switch
                        id="maintenance-mode"
                        checked={isMaintenanceMode}
                        onCheckedChange={handleMaintenanceToggle}
                        disabled={updatingStates['maintenance']}
                        aria-label="Toggle maintenance mode"
                    />
                </div>
            </CardContent>
        </Card>
    </div>
  );
}

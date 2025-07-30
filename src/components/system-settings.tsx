
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { saveMaintenanceStatus, getUsers, getImageList, getHistoryList, ImageFile, StoredUser } from '@/services/webdav';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import { Wrench, CheckCircle, Upload } from 'lucide-react';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface UserStats {
  completed: number;
  uploaded: number;
}

interface AllStats {
  totalCompleted: number;
  totalUploaded: number;
  userStats: Record<string, UserStats>;
}

export default function SystemSettings() {
  const { user, isMaintenanceMode, setMaintenanceMode, isLoading: isAuthLoading } = useAuth();
  const [updatingStates, setUpdatingStates] = useState<Record<string, boolean>>({});
  const [stats, setStats] = useState<AllStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!isAuthLoading) {
      if (!user) {
        router.push('/login');
      } else if (!user.isAdmin) {
        router.push('/dashboard');
      }
    }
  }, [user, isAuthLoading, router]);

  useEffect(() => {
    async function fetchAndComputeStats() {
      if (user?.isAdmin) {
        setIsLoading(true);
        try {
          const [images, history, users] = await Promise.all([
            getImageList(),
            getHistoryList(),
            getUsers()
          ]);
          
          const userStats: Record<string, UserStats> = {};
          users.forEach(u => {
            userStats[u.username] = { completed: 0, uploaded: 0 };
          });

          const allItems = [...images, ...history];

          allItems.forEach(item => {
            if (item.uploadedBy && userStats[item.uploadedBy]) {
              userStats[item.uploadedBy].uploaded++;
            }
          });
          
          history.forEach(item => {
            if (item.completedBy && userStats[item.completedBy]) {
               userStats[item.completedBy].completed++;
            }
          });
          
          const totalUploaded = allItems.length;
          const totalCompleted = history.length;

          setStats({
            totalCompleted,
            totalUploaded,
            userStats,
          });
        } catch (error) {
          console.error("Failed to load stats:", error);
           toast({
            variant: "destructive",
            title: "加载失败",
            description: "无法加载统计数据。",
          });
        } finally {
          setIsLoading(false);
        }
      }
    }

    if (user?.isAdmin) {
        fetchAndComputeStats();
    }
  }, [user, toast]);

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

  const sortedUsers = stats ? Object.entries(stats.userStats).sort(([, a], [, b]) => b.completed - a.completed) : [];

  const renderSkeleton = () => (
     <div className="container mx-auto py-8 px-4 md:px-6 space-y-8">
        <Card className="mb-8">
            <CardHeader>
                <CardTitle>系统面板</CardTitle>
                <CardDescription>管理并查看整个应用程序的全局设置和统计数据。</CardDescription>
            </CardHeader>
        </Card>

        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-24 mb-1" />
                <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-12 w-full" />
            </CardContent>
        </Card>

         <Card>
            <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-40 w-full" />
            </CardContent>
        </Card>
    </div>
  );

  if (isAuthLoading || isLoading) {
    return renderSkeleton();
  }

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 space-y-8">
        <Card>
            <CardHeader>
                <CardTitle>系统面板</CardTitle>
                <CardDescription>管理并查看整个应用程序的全局设置和统计数据。</CardDescription>
            </CardHeader>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>系统设置</CardTitle>
                <CardDescription>管理应用程序范围的设置。</CardDescription>
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

        <Card>
            <CardHeader>
                <CardTitle>统计数据</CardTitle>
                <CardDescription>查看整个系统的使用情况和用户贡献。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {stats && (
                    <>
                     <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">总上传数</CardTitle>
                            <Upload className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalUploaded}</div>
                        </CardContent>
                        </Card>
                        <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">总完成数</CardTitle>
                            <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalCompleted}</div>
                        </CardContent>
                        </Card>
                    </div>

                    <div>
                        <h4 className="text-lg font-semibold mb-2">用户排行榜</h4>
                        <div className="border rounded-lg">
                            <Table>
                                <TableHeader>
                                <TableRow>
                                    <TableHead>排名</TableHead>
                                    <TableHead>用户</TableHead>
                                    <TableHead className="text-right">完成数</TableHead>
                                    <TableHead className="text-right">上传数</TableHead>
                                </TableRow>
                                </TableHeader>
                                <TableBody>
                                {sortedUsers.length > 0 ? sortedUsers.map(([username, data], index) => (
                                    <TableRow key={username}>
                                    <TableCell className="font-medium">{index + 1}</TableCell>
                                    <TableCell>{username}{user?.username === username && " (您)"}</TableCell>
                                    <TableCell className="text-right">{data.completed}</TableCell>
                                    <TableCell className="text-right">{data.uploaded}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground">暂无数据</TableCell>
                                    </TableRow>
                                )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                    </>
                )}
            </CardContent>
        </Card>
    </div>
  );
}

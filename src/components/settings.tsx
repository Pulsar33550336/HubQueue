
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUsers, saveUsers, StoredUser, getMaintenanceStatus, saveMaintenanceStatus } from '@/services/webdav';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import { ShieldCheck, User as UserIcon, Wrench } from 'lucide-react';
import { Label } from './ui/label';

export default function Settings() {
  const { user, isMaintenanceMode, setMaintenanceMode, isLoading: isAuthLoading, updateUserStatus } = useAuth();
  const [users, setUsers] = useState<StoredUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingStates, setUpdatingStates] = useState<Record<string, boolean>>({});
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!isAuthLoading && (!user || !user.isAdmin)) {
      router.push('/dashboard');
    }
  }, [user, isAuthLoading, router]);

  const fetchUsers = async () => {
      if (user?.isAdmin) {
        setIsLoading(true);
        try {
           const [userList, maintenanceStatus] = await Promise.all([
            getUsers(),
            getMaintenanceStatus(),
          ]);
          setUsers(userList);
          setMaintenanceMode(maintenanceStatus.isMaintenance);
        } catch (error) {
          toast({
            variant: "destructive",
            title: "加载用户失败",
            description: "无法从服务器获取用户列表。",
          });
        } finally {
          setIsLoading(false);
        }
      }
    };
    
  useEffect(() => {
    fetchUsers();
  }, [user]);
  
  const handleTrustToggle = async (username: string, isTrusted: boolean) => {
    setUpdatingStates(prev => ({ ...prev, [username]: true }));
    const originalUsers = [...users];
    const updatedUsers = users.map(u => 
        u.username === username ? { ...u, isTrusted } : u
    );
    setUsers(updatedUsers);

    const { success, error } = await saveUsers(updatedUsers);
    
    if (!success) {
        toast({
            variant: 'destructive',
            title: '更新失败',
            description: error || '无法保存用户权限更改。',
        });
        setUsers(originalUsers);
    } else {
         toast({
            title: '更新成功',
            description: `用户 ${username} 的权限已更新。`,
        });
        
        if (user && user.username === username) {
           await updateUserStatus(username);
        }
        
        await fetchUsers();
    }
    setUpdatingStates(prev => ({ ...prev, [username]: false }));
  };

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

  if (isAuthLoading || isLoading) {
    return (
        <div className="container mx-auto py-8 px-4 md:px-6">
            <Card className='mb-8'>
                <CardHeader>
                    <CardTitle>系统设置</CardTitle>
                    <CardDescription>正在加载系统设置...</CardDescription>
                </CardHeader>
                 <CardContent>
                    <Skeleton className="h-8 w-48" />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>用户管理</CardTitle>
                    <CardDescription>正在加载用户列表...</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <Skeleton className="h-8 w-8 rounded-full" />
                                    <Skeleton className="h-4 w-24" />
                                </div>
                                <Skeleton className="h-6 w-12" />
                            </div>
                        ))}
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
        <Card>
            <CardHeader>
            <CardTitle>用户管理</CardTitle>
            <CardDescription>授予或撤销用户的任务认领权限。</CardDescription>
            </CardHeader>
            <CardContent>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>用户</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead className="text-right">可信状态</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {users.map((u) => (
                    <TableRow key={u.username}>
                    <TableCell className="font-medium">{u.username}</TableCell>
                    <TableCell>
                        {u.isAdmin ? (
                            <span className="flex items-center gap-2 font-semibold text-primary">
                                <ShieldCheck className="h-4 w-4" /> 管理员
                            </span>
                        ) : (
                            <span className="flex items-center gap-2 text-muted-foreground">
                                <UserIcon className="h-4 w-4" /> 用户
                            </span>
                        )}
                    </TableCell>
                    <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                            <span className={`text-sm font-medium ${u.isTrusted || u.isAdmin ? 'text-primary' : 'text-muted-foreground'}`}>
                            {u.isTrusted || u.isAdmin ? '可信' : '不可信'}
                            </span>
                            <Switch
                                checked={u.isTrusted || u.isAdmin}
                                onCheckedChange={(checked) => handleTrustToggle(u.username, checked)}
                                disabled={u.isAdmin || updatingStates[u.username]}
                                aria-label={`Toggle trust for ${u.username}`}
                            />
                        </div>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
            </CardContent>
        </Card>
    </div>
  );
}

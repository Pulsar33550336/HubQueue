
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUsers, saveUsers, StoredUser } from '@/services/webdav';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import { ShieldCheck, User as UserIcon, Loader2 } from 'lucide-react';

export default function UserManagement() {
  const { user, isLoading: isAuthLoading, updateUserStatus } = useAuth();
  const [users, setUsers] = useState<StoredUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
          const userList = await getUsers();
          setUsers(userList);
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
    // Optimistically update UI
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
        // Revert UI on failure
        setUsers(originalUsers);
    } else {
         toast({
            title: '更新成功',
            description: `用户 ${username} 的权限已更新。`,
        });
        
        // If the admin is updating themselves, refresh their auth context
        if (user && user.username === username) {
           await updateUserStatus(username);
        }
        
        // Refresh the user list from server to be sure
        await fetchUsers();
    }
  };

  if (isAuthLoading || isLoading) {
    return (
        <div className="container mx-auto py-8 px-4 md:px-6">
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
                            disabled={u.isAdmin}
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

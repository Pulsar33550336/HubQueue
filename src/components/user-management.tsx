
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUsers, saveUsers, StoredUser, UserRole } from '@/services/webdav';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import { ShieldCheck, User as UserIcon, Trash2, Ban, UserCheck } from 'lucide-react';
import { Button } from './ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const roleLabels: Record<UserRole, string> = {
  admin: '管理员',
  trusted: '可信用户',
  user: '用户',
  banned: '已封禁',
};

const roleIcons: Record<UserRole, React.ReactNode> = {
    admin: <ShieldCheck className="h-4 w-4 text-primary" />,
    trusted: <UserCheck className="h-4 w-4 text-green-500" />,
    user: <UserIcon className="h-4 w-4 text-muted-foreground" />,
    banned: <Ban className="h-4 w-4 text-destructive" />,
};

export default function UserManagement() {
  const { user, isLoading: isAuthLoading, updateUserStatus } = useAuth();
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
           const userList = await getUsers();
           setUsers(userList);
        } catch (error) {
          toast({
            variant: "destructive",
            title: "加载失败",
            description: "无法从服务器获取用户列表。",
          });
        } finally {
          setIsLoading(false);
        }
      }
    };
    
  useEffect(() => {
    fetchUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  
  const handleRoleChange = async (username: string, newRole: UserRole) => {
    setUpdatingStates(prev => ({ ...prev, [username]: true }));
    const originalUsers = [...users];
    const updatedUsers = users.map(u => 
        u.username === username ? { ...u, role: newRole } : u
    );
    setUsers(updatedUsers);

    const { success, error } = await saveUsers(updatedUsers);
    
    if (!success) {
        toast({
            variant: 'destructive',
            title: '更新失败',
            description: error || '无法保存用户角色更改。',
        });
        setUsers(originalUsers);
    } else {
         toast({
            title: '更新成功',
            description: `用户 ${username} 的角色已更新为 ${roleLabels[newRole]}。`,
        });
        
        if (user && user.username === username) {
           await updateUserStatus(username);
        }
        await fetchUsers(); // Refetch to ensure consistency, though local state is updated
    }
    setUpdatingStates(prev => ({ ...prev, [username]: false }));
  };

  const handleDeleteUser = async (username: string) => {
    if (user?.username === username) {
        toast({
            variant: 'destructive',
            title: '操作失败',
            description: '您不能删除自己。',
        });
        return;
    }

    setUpdatingStates(prev => ({ ...prev, [`delete-${username}`]: true }));
    const originalUsers = [...users];
    const updatedUsers = users.filter(u => u.username !== username);
    setUsers(updatedUsers);

    const { success, error } = await saveUsers(updatedUsers);
    if (!success) {
        toast({
            variant: 'destructive',
            title: '删除失败',
            description: error || '无法删除用户。',
        });
        setUsers(originalUsers);
    } else {
        toast({
            title: '删除成功',
            description: `用户 ${username} 已被删除。`,
        });
        await fetchUsers();
    }
    setUpdatingStates(prev => ({ ...prev, [`delete-${username}`]: false }));
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
                     <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                            <TableHead><Skeleton className="h-4 w-32" /></TableHead>
                            <TableHead className="text-right"><Skeleton className="h-4 w-16" /></TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {[...Array(3)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
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
            <CardDescription>管理用户的角色、权限和状态。</CardDescription>
            </CardHeader>
            <CardContent>
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>用户</TableHead>
                        <TableHead>角色</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {users.map((u, index) => {
                        const isInitialAdmin = index === 0;
                        const isSelf = u.username === user?.username;
                        return (
                            <TableRow key={u.username} className={u.role === 'banned' ? 'bg-destructive/10' : ''}>
                            <TableCell className="font-medium">{u.username}</TableCell>
                            <TableCell>
                                <Select 
                                    value={u.role}
                                    onValueChange={(newRole) => handleRoleChange(u.username, newRole as UserRole)}
                                    disabled={isInitialAdmin || updatingStates[u.username]}
                                >
                                    <SelectTrigger className="w-[140px] h-9">
                                        <SelectValue placeholder="选择角色">
                                            <div className="flex items-center gap-2">
                                                {roleIcons[u.role]}
                                                <span>{roleLabels[u.role]}</span>
                                            </div>
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(Object.keys(roleLabels) as UserRole[]).map(role => (
                                            <SelectItem key={role} value={role}>
                                                <div className="flex items-center gap-2">
                                                   {roleIcons[role]}
                                                   <span>{roleLabels[role]}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </TableCell>
                            <TableCell className="text-right">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    disabled={isInitialAdmin || isSelf || updatingStates[`delete-${u.username}`]}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                    <span className="sr-only">删除用户</span>
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>确定要删除用户 {u.username} 吗？</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      此操作无法撤销。这将永久删除该用户账户，但不会删除其历史操作记录。
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>取消</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteUser(u.username)}>确认删除</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                            </TableRow>
                        );
                    })}
                    </TableBody>
                </Table>
            </div>
            </CardContent>
        </Card>
    </div>
  );
}

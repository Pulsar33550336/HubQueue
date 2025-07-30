
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getHistoryList, getImageList, getUsers, ImageFile, StoredUser } from '@/services/webdav';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from './ui/skeleton';
import { format } from 'date-fns';

export default function History() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [history, setHistory] = useState<ImageFile[]>([]);
  const [users, setUsers] = useState<StoredUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

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
    async function fetchData() {
      if (user?.isAdmin) {
        setIsLoading(true);
        try {
           const [historyList, userList] = await Promise.all([getHistoryList(), getUsers()]);
           setHistory(historyList);
           setUsers(userList);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchData();
  }, [user]);

  const isUserDeleted = (username: string) => {
    return !users.some(u => u.username === username);
  };

  const renderSkeleton = () => (
     <div className="container mx-auto py-8 px-4 md:px-6">
        <Card>
            <CardHeader>
                <CardTitle>历史记录</CardTitle>
                <CardDescription>查看所有已完成的任务。</CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead><Skeleton className="h-4 w-48" /></TableHead>
                            <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                            <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                            <TableHead><Skeleton className="h-4 w-32" /></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                    {[...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-56" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );

  if (isAuthLoading || isLoading || !user?.isAdmin) {
    return renderSkeleton();
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
        <Card>
            <CardHeader>
                <CardTitle>历史记录</CardTitle>
                <CardDescription>查看所有已完成的任务。</CardDescription>
            </CardHeader>
            <CardContent>
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>任务名</TableHead>
                        <TableHead>上传者</TableHead>
                        <TableHead>完成者</TableHead>
                        <TableHead>完成时间</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {history.length > 0 ? history.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>
                                {item.uploadedBy}
                                {isUserDeleted(item.uploadedBy) && <span className="text-xs text-muted-foreground ml-1">(已删除)</span>}
                            </TableCell>
                            <TableCell>
                                {item.completedBy}
                                {item.completedBy && isUserDeleted(item.completedBy) && <span className="text-xs text-muted-foreground ml-1">(已删除)</span>}
                            </TableCell>
                            <TableCell>
                                {item.completedAt ? format(new Date(item.completedAt), 'yyyy-MM-dd HH:mm:ss') : 'N/A'}
                            </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                                暂无历史记录
                            </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
            </div>
            </CardContent>
        </Card>
    </div>
  );
}


"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getHistoryList, ImageFile } from '@/services/webdav';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from './ui/skeleton';
import { format } from 'date-fns';

export default function History() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [history, setHistory] = useState<ImageFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/login');
    }
  }, [user, isAuthLoading, router]);

  useEffect(() => {
    async function fetchHistory() {
      if (user) {
        setIsLoading(true);
        try {
           const historyList = await getHistoryList();
           setHistory(historyList);
        } catch (error) {
            console.error("Failed to fetch history", error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchHistory();
  }, [user]);

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

  if (isAuthLoading || isLoading) {
    return renderSkeleton();
  }

  if (!user) {
    return null;
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
                            <TableCell>{item.uploadedBy}</TableCell>
                            <TableCell>{item.completedBy}</TableCell>
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

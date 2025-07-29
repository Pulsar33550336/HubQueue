"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wrench } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { login, user, isLoading: isAuthLoading, isMaintenanceMode } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!isAuthLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isAuthLoading, router]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    const success = await login(username, password);
    if (success) {
      router.push('/dashboard');
    } else {
      toast({
        variant: "destructive",
        title: "登录失败",
        description: "无效的用户名或密码。",
      });
    }
    setIsLoggingIn(false);
  };
  
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleLogin();
    }
  };

  if (isAuthLoading || (!isAuthLoading && user)) {
     return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="relative h-10 w-10">
                            <Skeleton className="h-10 w-10 rounded-full" />
                        </div>
                        <Skeleton className="h-7 w-28" />
                    </div>
                    <Skeleton className="h-6 w-3/4 mx-auto" />
                    <Skeleton className="h-4 w-1/2 mx-auto" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-4 w-48" />
                </CardFooter>
            </Card>
        </div>
     );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
                <div className="relative h-10 w-10">
                    <Image 
                        src="https://raw.githubusercontent.com/ClassIsland/ClassIsland/master/ClassIsland/Assets/AppLogo_AppLogo.svg" 
                        alt="HubQueue Logo"
                        fill
                        className="object-contain"
                        unoptimized
                    />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">HubQueue</h1>
            </div>
          <CardTitle>欢迎回来</CardTitle>
          <CardDescription>输入您的凭据以访问仪表板。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isMaintenanceMode && (
            <Alert variant="default" className="border-primary/50 text-primary">
              <Wrench className="h-4 w-4" />
              <AlertTitle>正在维护</AlertTitle>
              <AlertDescription>
                网站正在维护中，只有管理员可以登录。
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入您的用户名"
              required
              disabled={isLoggingIn}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入您的密码"
              required
              disabled={isLoggingIn}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button onClick={handleLogin} className="w-full" disabled={isLoggingIn}>
            {isLoggingIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            登录
          </Button>
           <p className="text-sm text-center text-muted-foreground">
              还没有账户？{' '}
              <Link href="/register" className="font-semibold text-primary hover:underline">
                注册
              </Link>
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}

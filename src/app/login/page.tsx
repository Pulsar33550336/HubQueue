"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { GitCommit, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { login, user, isLoading: isAuthLoading } = useAuth();
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

  if (isAuthLoading || user) {
    return null; // Or a loading spinner, to prevent flashing the form
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
                <div className="p-2 bg-accent/20 rounded-lg">
                    <GitCommit className="h-7 w-7" style={{ color: 'hsl(var(--accent))' }}/>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">HubQueue</h1>
            </div>
          <CardTitle>欢迎回来</CardTitle>
          <CardDescription>输入您的凭据以访问仪表板。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

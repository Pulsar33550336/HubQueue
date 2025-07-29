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

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const { register, user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!isAuthLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isAuthLoading, router]);

  const handleRegister = async () => {
    setIsRegistering(true);
    const result = await register(username, password);
    if (result.success) {
      router.push('/dashboard');
      toast({
        title: "注册成功",
        description: "欢迎来到 HubQueue！",
      });
    } else {
      toast({
        variant: "destructive",
        title: "注册失败",
        description: result.message,
      });
    }
    setIsRegistering(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleRegister();
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
              <GitCommit className="h-7 w-7" style={{ color: 'hsl(var(--accent))' }} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">HubQueue</h1>
          </div>
          <CardTitle>创建账户</CardTitle>
          <CardDescription>输入您的凭据以开始使用。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="选择一个用户名"
              required
              disabled={isRegistering}
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
              placeholder="选择一个密码"
              required
              disabled={isRegistering}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button onClick={handleRegister} className="w-full" disabled={isRegistering}>
            {isRegistering && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            注册
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            已经有账户了？{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              登录
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

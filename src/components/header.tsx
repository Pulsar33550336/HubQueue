import { LogOut, Settings as SettingsIcon, User, Users, Wrench, BarChart, History, Sun, Moon, Laptop } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from "next-themes"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from './ui/avatar';
import Logo from './logo';


export default function Header() {
  const { user, logout } = useAuth();
  const { setTheme } = useTheme();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  }

  const getRoleLabel = () => {
    if (!user) return '';
    switch (user.role) {
      case 'admin': return '管理员';
      case 'trusted': return '可信用户';
      case 'user': return '用户';
      case 'banned': return '已封禁';
      default: return '用户';
    }
  };

  return (
    <header className="bg-card border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="relative h-8 w-8">
            <Logo width={32} height={32} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">HubQueue</h1>
        </Link>
        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-3">
               <div className="text-right">
                  <p className="text-sm font-semibold leading-none">{user.username}</p>
                  <p className="text-xs text-muted-foreground">{getRoleLabel()}</p>
                </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>
                          <User className="h-5 w-5"/>
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.username}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {getRoleLabel()}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                   <DropdownMenuItem onClick={() => router.push('/settings')}>
                      <SettingsIcon className="mr-2 h-4 w-4" />
                      <span>个人设置</span>
                    </DropdownMenuItem>
                   <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Sun className="mr-2 h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                      <Moon className="absolute mr-2 h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                      <span>外观主题</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => setTheme("light")}>
                        <Sun className="mr-2 h-4 w-4" />
                        <span>浅色</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme("dark")}>
                        <Moon className="mr-2 h-4 w-4" />
                        <span>深色</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme("system")}>
                        <Laptop className="mr-2 h-4 w-4" />
                        <span>系统</span>
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  {user.isAdmin && (
                    <>
                      <DropdownMenuItem onClick={() => router.push('/history')}>
                        <History className="mr-2 h-4 w-4" />
                        <span>历史记录</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push('/users')}>
                        <Users className="mr-2 h-4 w-4" />
                        <span>用户管理</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push('/system-settings')}>
                        <Wrench className="mr-2 h-4 w-4" />
                        <span>系统面板</span>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>退出登录</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

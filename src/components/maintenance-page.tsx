
"use client";

import { Wrench } from 'lucide-react';
import Header from './header';

export default function MaintenancePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center text-center p-4">
        <Wrench className="w-24 h-24 text-muted-foreground mb-6" />
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">
          正在维护中
        </h1>
        <p className="text-lg text-muted-foreground">
          我们正在努力改进 HubQueue。请稍后回来查看！
        </p>
      </main>
    </div>
  );
}

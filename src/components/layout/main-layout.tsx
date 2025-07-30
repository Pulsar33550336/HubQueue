
"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Header from "@/components/header";
import { Skeleton } from "../ui/skeleton";
import MaintenancePage from "../maintenance-page";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, isMaintenanceMode } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      const callbackUrl = pathname;
      router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading) {
    return (
        <div className="flex flex-col min-h-screen">
            <header className="bg-card border-b">
                <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-7 w-28" />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <Skeleton className="h-4 w-16 mb-1.5" />
                                <Skeleton className="h-3 w-12" />
                            </div>
                            <Skeleton className="h-9 w-9 rounded-full" />
                        </div>
                    </div>
                </div>
            </header>
            <main className="flex-1 container mx-auto py-8 px-4 md:px-6">
                 <div className="mb-8">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-4 w-72 mt-2" />
                 </div>
                 <Skeleton className="h-40 w-full" />
                 <div className="mt-8">
                    <Skeleton className="h-8 w-48" />
                     <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-6">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="space-y-4">
                                <Skeleton className="h-40 w-full" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-5/6" />
                                    <Skeleton className="h-8 w-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                 </div>
            </main>
        </div>
    );
  }
  
  if (!user) {
    // This case should theoretically be covered by the useEffect redirect,
    // but as a fallback, we can show the skeleton or return null.
    // Returning the skeleton is better to avoid layout shifts.
     return (
        <div className="flex flex-col min-h-screen">
            <header className="bg-card border-b">
                <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
                     <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-7 w-28" />
                    </div>
                    <Skeleton className="h-9 w-9 rounded-full" />
                </div>
            </header>
            <main className="flex-1 p-8">
                <Skeleton className="h-screen w-full" />
            </main>
        </div>
    );
  }

  if (isMaintenanceMode && !user.isAdmin) {
    return <MaintenancePage />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1">{children}</main>
    </div>
  );
}

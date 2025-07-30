
import { Suspense } from 'react';
import LoginForm from '@/components/login-form';
import { Skeleton } from '@/components/ui/skeleton';

function LoginPageSkeleton() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
             <div className="w-full max-w-sm p-6 space-y-4 border rounded-lg shadow-sm bg-card">
                <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="relative h-10 w-10">
                            <Skeleton className="h-10 w-10 rounded-full" />
                        </div>
                        <Skeleton className="h-7 w-28" />
                    </div>
                    <Skeleton className="h-6 w-3/4 mx-auto" />
                    <Skeleton className="h-4 w-1/2 mx-auto" />
                </div>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </div>
                <div className="flex flex-col gap-4 pt-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-4 w-48 mx-auto" />
                </div>
            </div>
        </div>
    );
}


export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}

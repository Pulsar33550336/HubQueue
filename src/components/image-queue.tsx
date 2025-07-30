
import type { ImageFile } from '@/types';
import { ImageCard } from './image-card';
import { FileQuestion, RefreshCw, Upload, CheckCircle, User, Users } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';

interface ImageQueueProps {
  images: ImageFile[];
  stats: {
    totalUploaded: number;
    totalCompleted: number;
    userUploaded: number;
    userCompleted: number;
  };
  onClaim: (id: string) => void;
  onUnclaim: (id: string) => void;
  onUpload: (id: string) => void;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  isSyncing: boolean;
}

export function ImageQueue({ images, stats, onClaim, onUnclaim, onUpload, onComplete, onDelete, isSyncing }: ImageQueueProps) {
  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold tracking-tight">图片队列</h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isSyncing && (
                <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> 
                    <span>同步中...</span>
                </>
            )}
        </div>
      </div>

       <div className="grid gap-4 md:grid-cols-2 mb-8">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">您的贡献</CardTitle>
                    <User className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <Upload className="h-5 w-5 text-primary" />
                            <div>
                                <p className="text-2xl font-bold">{stats.userUploaded}</p>
                                <p className="text-xs text-muted-foreground">上传</p>
                            </div>
                        </div>
                         <div className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <div>
                                <p className="text-2xl font-bold">{stats.userCompleted}</p>
                                <p className="text-xs text-muted-foreground">完成</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">队列总览</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-6">
                       <div className="flex items-center gap-2">
                            <Upload className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-2xl font-bold">{stats.totalUploaded}</p>
                                <p className="text-xs text-muted-foreground">总上传</p>
                            </div>
                        </div>
                         <div className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-2xl font-bold">{stats.totalCompleted}</p>
                                <p className="text-xs text-muted-foreground">总完成</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

      {images.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {images.map(image => (
            <ImageCard 
              key={image.id}
              image={image}
              onClaim={onClaim}
              onUnclaim={onUnclaim}
              onUpload={onUpload}
              onComplete={onComplete}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-lg text-center bg-card">
          <FileQuestion className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold">队列是空的</h3>
          <p className="text-muted-foreground mt-2">上传一张图片开始吧。</p>
        </div>
      )}
    </div>
  );
}

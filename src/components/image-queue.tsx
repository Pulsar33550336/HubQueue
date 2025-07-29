import type { ImageFile } from '@/types';
import { ImageCard } from './image-card';
import { FileQuestion, RefreshCw } from 'lucide-react';

interface ImageQueueProps {
  images: ImageFile[];
  onClaim: (id: string) => void;
  onUnclaim: (id: string) => void;
  onUpload: (id: string) => void;
  onDelete: (id: string) => void;
  isSyncing: boolean;
}

export function ImageQueue({ images, onClaim, onUnclaim, onUpload, onDelete, isSyncing }: ImageQueueProps) {
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
      {images.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {images.map(image => (
            <ImageCard 
              key={image.id}
              image={image}
              onClaim={onClaim}
              onUnclaim={onUnclaim}
              onUpload={onUpload}
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

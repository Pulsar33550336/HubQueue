
import Image from 'next/image';
import { useState } from 'react';
import type { ImageFile } from '@/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, GitBranch, CheckCircle2, RefreshCcw, Trash2, User, Download, PartyPopper, Ban, ShieldQuestion, Undo2, ChevronsRight, ShieldAlert } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useAuth } from '@/context/AuthContext';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';


interface ImageCardProps {
  image: ImageFile;
  onClaim: (id: string) => void;
  onUnclaim: (id: string) => void;
  onUpload: (id: string) => void; 
  onComplete: (id: string, notes: string) => void;
  onDelete: (id: string) => void;
}

const statusConfig = {
  queued: { variant: 'secondary', label: '排队中' },
  'in-progress': { variant: 'default', label: '处理中' },
  uploaded: { variant: 'outline', label: '待处理' },
  error: { variant: 'destructive', label: '错误' },
  completed: { variant: 'default', label: '已完成'},
} as const;


export function ImageCard({ image, onClaim, onUnclaim, onUpload, onComplete, onDelete }: ImageCardProps) {
  const { user } = useAuth();
  const { id, name, url, status, claimedBy, uploadedBy, isUploading } = image;
  const config = statusConfig[status];
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [completionNotes, setCompletionNotes] = useState('');
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);


  const getAiHint = (imageName: string): string => {
    return imageName.split('.')[0].replace(/-/g, ' ').split(' ').slice(0, 2).join(' ');
  };

  const handleRetryUpload = () => {
    onUpload(id); 
  }
  
  const handleDownload = async () => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        a.remove();
    } catch (error) {
        console.error("Download failed:", error);
    }
  };

  const handleConfirmCompletion = () => {
    onComplete(id, completionNotes);
    setIsCompleteDialogOpen(false);
    setCompletionNotes('');
  }
  
  const isClaimedByCurrentUser = status === 'in-progress' && claimedBy === user?.username;
  const isClaimedByOther = status === 'in-progress' && claimedBy && claimedBy !== user?.username;
  
  const canUserDelete = user?.isAdmin || user?.username === uploadedBy;

  return (
    <Card className="flex flex-col overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 rounded-lg">
      <CardContent className="p-0">
        <div className="aspect-video relative bg-muted">
          {isImageLoading && <Skeleton className="absolute inset-0 w-full h-full" />}
          <Image 
            src={url} 
            alt={name} 
            fill 
            className={`object-cover transition-opacity duration-300 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
            data-ai-hint={getAiHint(name)} 
            unoptimized
            onLoad={() => setIsImageLoading(false)}
            onError={() => setIsImageLoading(false)}
          />
        </div>
      </CardContent>
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2 gap-2">
            <h3 className="font-semibold text-sm leading-snug break-all text-foreground">{name}</h3>
            <div className="flex items-center gap-2">
              {canUserDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>确认从索引中删除？</AlertDialogTitle>
                      <AlertDialogDescription>
                        此操作将从队列中移除 <span className="font-semibold">{name}</span> 的记录。服务器上的原始文件将不会被删除。此操作无法撤销。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(id)}>确认删除</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Badge variant={config.variant} className="flex-shrink-0">{config.label}</Badge>
            </div>
        </div>
        
        <div className="flex items-center text-xs text-muted-foreground mb-4 gap-4">
             {status === 'in-progress' && claimedBy && (
                <div className="flex items-center">
                    <User className="w-3 h-3 mr-1.5"/>
                    认领者：{claimedBy === user?.username ? '您' : claimedBy}
                </div>
            )}
            <div className="flex items-center">
                <User className="w-3 h-3 mr-1.5" />
                上传者: {uploadedBy === user?.username ? '您' : uploadedBy}
            </div>
        </div>

        <div className="flex-grow"></div>
        <CardFooter className="p-0 mt-4">
            <div className="w-full flex items-center justify-between gap-2">
                <div className='flex-1'>
                    {status === 'uploaded' && (
                        (user?.isTrusted) ? (
                          <Button onClick={() => onClaim(id)} size="sm" className="w-full">
                              <GitBranch className="mr-2 h-4 w-4"/>
                              认领任务
                          </Button>
                        ) : (
                          <Button size="sm" className="w-full" disabled>
                            <ShieldQuestion className="mr-2 h-4 w-4"/>
                            等待可信用户接单
                          </Button>
                        )
                    )}
                    {isClaimedByCurrentUser && (
                         <div className="w-full grid grid-cols-3 gap-2">
                            <Button onClick={handleDownload} size="sm" variant="secondary">
                                <Download className="mr-2 h-4 w-4" />
                                下载
                            </Button>
                            <Button onClick={() => onUnclaim(id)} size="sm" variant="outline">
                               <Undo2 className="mr-2 h-4 w-4" />
                                放回
                            </Button>
                             <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm">
                                        <PartyPopper className="mr-2 h-4 w-4" />
                                        完成
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>标记为完成？</DialogTitle>
                                    <DialogDescription>
                                    即将把任务 <span className="font-semibold">{name}</span> 标记为完成。您可以选择留下备注。
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="py-4">
                                  <Label htmlFor="completion-notes">备注 (可选)</Label>
                                  <Textarea 
                                    id="completion-notes"
                                    placeholder="输入您的备注..."
                                    value={completionNotes}
                                    onChange={(e) => setCompletionNotes(e.target.value)}
                                    className="mt-2"
                                  />
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild>
                                      <Button variant="outline">取消</Button>
                                    </DialogClose>
                                    <Button onClick={handleConfirmCompletion}>确认完成</Button>
                                </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    )}
                    {isClaimedByOther && (
                        user?.isAdmin ? (
                            <Button onClick={() => onUnclaim(id)} size="sm" variant="destructive" className="w-full">
                                <ShieldAlert className="mr-2 h-4 w-4" />
                                强制放回
                            </Button>
                        ) : (
                            <Button size="sm" className="w-full" disabled>
                                <ChevronsRight className="mr-2 h-4 w-4"/>
                                正在处理
                            </Button>
                        )
                    )}
                     {status === 'queued' && (
                        <div className="flex items-center justify-center text-sm font-medium text-muted-foreground">
                           等待上传
                        </div>
                    )}
                    {status === 'error' && (
                       <Button onClick={handleRetryUpload} variant="destructive" size="sm" className="w-full" disabled={isUploading}>
                            {isUploading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                            ) : (
                                <RefreshCcw className="mr-2 h-4 w-4"/>
                            )}
                            {isUploading ? '重试中...' : '重试上传'}
                        </Button>
                    )}
                </div>
            </div>
        </CardFooter>
      </div>
    </Card>
  );
}

"use client";

import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { UploadCloud, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { uploadToWebdav } from '@/services/webdav';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ImageUploaderProps {
  onImageUploaded: (image: { name: string, webdavPath: string }) => void;
}

export function ImageUploader({ onImageUploaded }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customFileName, setCustomFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleCardClick = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  const handleFileValidation = (file: File | null | undefined): boolean => {
    if (!file) return false;

    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "无效的文件类型",
        description: "请选择一个 JPG 或 PNG 格式的图片文件。",
      });
      return false;
    }
    return true;
  }

  const processFile = (file: File) => {
    if (!handleFileValidation(file) || isUploading) return;
    
    setSelectedFile(file);
    setCustomFileName(file.name.substring(0, file.name.lastIndexOf('.')) || file.name);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    setIsDialogOpen(true);
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    processFile(event.target.files?.[0] as File);
     if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleDragEvents = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    handleDragEvents(e);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    handleDragEvents(e);
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    handleDragEvents(e);
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const handleUploadConfirm = async () => {
    if (!selectedFile || !customFileName) return;
    
    setIsUploading(true);
    setIsDialogOpen(false);
    
    const fileExtension = selectedFile.name.split('.').pop() || 'png';
    const finalFileName = `${customFileName.trim()}.${fileExtension}`;
    
    try {
        const reader = new FileReader();
        reader.readAsDataURL(selectedFile);
        reader.onload = async (e) => {
            try {
                const dataUrl = e.target?.result as string;
                const result = await uploadToWebdav(finalFileName, dataUrl);
                
                if (result.success && result.path) {
                    onImageUploaded({ name: finalFileName, webdavPath: result.path });
                } else {
                    throw new Error(result.error || '上传失败，发生未知错误。');
                }
            } catch (error: any) {
                 toast({
                    variant: "destructive",
                    title: "上传失败",
                    description: error.message || `无法上传 ${finalFileName}。`,
                });
            } finally {
                setIsUploading(false);
                setSelectedFile(null);
                setPreviewUrl(null);
                setCustomFileName("");
            }
        };
        reader.onerror = (error) => {
            throw new Error('无法读取文件。');
        };
    } catch(error: any) {
        toast({
            variant: "destructive",
            title: "错误",
            description: error.message || `无法处理 ${finalFileName}。`,
        });
        setIsUploading(false);
    }
  };

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processFile(file);
            // Prevent the default paste action
            event.preventDefault(); 
            break;
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, []);


  return (
    <>
      <Card className="mb-8 shadow-sm">
        <CardHeader>
          <CardTitle>上传新图片</CardTitle>
          <CardDescription>点击、拖拽或直接从剪贴板粘贴一个 JPG/PNG 图片到页面以上传。</CardDescription>
        </CardHeader>
        <CardContent>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/png, image/jpeg"
            disabled={isUploading}
          />
          <div 
            className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg text-center bg-background transition-colors
              ${isUploading ? 'cursor-not-allowed bg-muted' : 'cursor-pointer hover:border-primary'}
              ${isDragging ? 'border-primary' : 'border-border'}`}
            onClick={handleCardClick}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragEvents}
            onDrop={handleDrop}
            role="button"
            tabIndex={isUploading ? -1 : 0}
            onKeyDown={(e) => !isUploading && (e.key === 'Enter' || e.key === ' ') && handleCardClick()}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-12 h-12 text-muted-foreground mb-4 animate-spin" />
                <p className="font-semibold mb-1">上传中...</p>
                <p className="text-muted-foreground text-sm">请稍候，文件正在上传。</p>
              </>
            ) : (
              <>
                <UploadCloud className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="font-semibold mb-1">点击或拖拽以上传图片</p>
                <p className="text-muted-foreground text-sm">支持 PNG, JPG 格式，或直接粘贴</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认上传</AlertDialogTitle>
            <AlertDialogDescription>
              请为您的图片文件命名。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-4">
            {previewUrl && (
                <div className="w-full aspect-video relative rounded-md overflow-hidden bg-muted">
                    <Image src={previewUrl} alt="图片预览" layout="fill" objectFit="contain" />
                </div>
            )}
            <div className="space-y-2">
                <Label htmlFor="custom-filename">文件名（不含扩展名）</Label>
                <Input 
                    id="custom-filename"
                    value={customFileName}
                    onChange={(e) => setCustomFileName(e.target.value)}
                    placeholder="输入文件名"
                />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
                setSelectedFile(null);
                setPreviewUrl(null);
            }}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleUploadConfirm} disabled={!customFileName.trim()}>上传</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export type ImageStatus = 'queued' | 'in-progress' | 'uploaded' | 'error' | 'completed';

export interface ImageFile {
  id: string;
  name: string;
  url: string; 
  webdavPath: string;
  status: ImageStatus;
  uploadedBy: string;
  claimedBy?: string;
  completedBy?: string;
  isUploading?: boolean;
  createdAt: number;
  claimedAt?: number;
  completedAt?: number;
  completionNotes?: string;
};

export type UserRole = 'admin' | 'trusted' | 'user' | 'banned';

export interface StoredUser {
  username: string;
  passwordHash: string;
  role: UserRole;
}

export interface SystemSettings {
    isMaintenance: boolean;
    selfDestructDays: number;
}

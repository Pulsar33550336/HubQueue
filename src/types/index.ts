export type ImageStatus = 'queued' | 'in-progress' | 'uploaded' | 'error';

export type ImageFile = {
  id: string;
  name: string;
  url: string; 
  webdavPath: string; // The full path to the file on WebDAV
  status: ImageStatus;
  uploadedBy: string; // Username of the user who uploaded the file
  claimedBy?: string;
  isUploading?: boolean;
  createdAt?: number; // Timestamp for sorting
};

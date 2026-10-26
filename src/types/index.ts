export interface User {
  id: string;
  email: string;
  username: string;
  salt: string;
  rsaPublicKey: string;
  encryptedPrivateKey: string;
  privateKeyIv: string;
  storageUsed: number;
  createdAt: string;
}

export interface VaultFile {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number; // encrypted size
  originalSize: number; // plaintext size
  folderId: string | null;
  ownerId: string;
  iv: string;
  wrappedKey: string;
  wrappedKeyIv: string;
  activeVersion: number;
  storagePath: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FileVersion {
  id: string;
  fileId: string;
  versionNumber: number;
  size: number;
  originalSize: number;
  iv: string;
  wrappedKey: string;
  wrappedKeyIv: string;
  storagePath: string;
  createdBy: string;
  changeNote?: string;
  createdAt: string;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  ownerId: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SharedFileItem {
  shareId: string;
  permission: 'view' | 'download';
  sharedAt: string;
  wrappedKeyForRecipient: string;
  owner: {
    id?: string;
    username: string;
    email: string;
  };
  file: VaultFile;
}

export interface ShareRecord {
  id: string;
  fileId: string;
  ownerId: string;
  recipientId: string;
  recipientEmail: string;
  wrappedKeyForRecipient: string;
  permission: 'view' | 'download';
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  targetType: string;
  targetId?: string;
  targetName?: string;
  details: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface DownloadLog {
  id: string;
  fileId: string;
  fileName: string;
  versionNumber: number;
  userId: string;
  userName: string;
  userEmail: string;
  mode: 'raw_encrypted' | 'decrypted_client';
  ipAddress?: string;
  userAgent?: string;
  downloadedAt: string;
}

export interface DashboardStats {
  fileCount: number;
  folderCount: number;
  sharedWithMeCount: number;
  totalStorageBytes: number;
  storageQuotaBytes: number;
}

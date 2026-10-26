import mongoose, { Schema, Document } from 'mongoose';

// ==========================================
// 1. User Interface & Schema
// ==========================================
export interface IUser {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  // Salt used for client-side PBKDF2 derivation of Master Key
  salt: string;
  // RSA-OAEP public key (base64 string or JWK string)
  rsaPublicKey: string;
  // RSA-OAEP private key encrypted with user's Master Key
  encryptedPrivateKey: string;
  // IV used for encrypting the RSA private key
  privateKeyIv: string;
  storageUsed: number; // in bytes
  createdAt: string;
  updatedAt: string;
}

export const UserSchema = new Schema<IUser>({
  id: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
  username: { type: String, required: true, unique: true, index: true, trim: true },
  passwordHash: { type: String, required: true },
  salt: { type: String, required: true },
  rsaPublicKey: { type: String, required: true },
  encryptedPrivateKey: { type: String, required: true },
  privateKeyIv: { type: String, required: true },
  storageUsed: { type: Number, default: 0 },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() },
});

// ==========================================
// 2. Folder Interface & Schema
// ==========================================
export interface IFolder {
  id: string;
  name: string;
  parentId: string | null; // null for root level
  ownerId: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export const FolderSchema = new Schema<IFolder>({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, trim: true },
  parentId: { type: String, default: null, index: true },
  ownerId: { type: String, required: true, index: true },
  color: { type: String, default: '#3b82f6' },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() },
});
FolderSchema.index({ ownerId: 1, parentId: 1 });

// ==========================================
// 3. File Interface & Schema
// ==========================================
export interface IVaultFile {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number; // encrypted blob size in bytes
  originalSize: number; // unencrypted size in bytes
  folderId: string | null;
  ownerId: string;
  // AES-GCM Initialization Vector for the file ciphertext (12 bytes base64)
  iv: string;
  // 256-bit AES-GCM File Key, wrapped (encrypted) with owner's Master Key (base64)
  wrappedKey: string;
  // IV used when wrapping the file key with master key
  wrappedKeyIv: string;
  activeVersion: number;
  storagePath: string; // disk storage key
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export const FileSchema = new Schema<IVaultFile>({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, index: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  originalSize: { type: Number, required: true },
  folderId: { type: String, default: null, index: true },
  ownerId: { type: String, required: true, index: true },
  iv: { type: String, required: true },
  wrappedKey: { type: String, required: true },
  wrappedKeyIv: { type: String, required: true },
  activeVersion: { type: Number, default: 1 },
  storagePath: { type: String, required: true },
  isDeleted: { type: Boolean, default: false, index: true },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() },
});
FileSchema.index({ ownerId: 1, folderId: 1, isDeleted: 1 });
FileSchema.index({ ownerId: 1, name: 1 });

// ==========================================
// 4. FileVersion Interface & Schema
// ==========================================
export interface IFileVersion {
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

export const FileVersionSchema = new Schema<IFileVersion>({
  id: { type: String, required: true, unique: true, index: true },
  fileId: { type: String, required: true, index: true },
  versionNumber: { type: Number, required: true },
  size: { type: Number, required: true },
  originalSize: { type: Number, required: true },
  iv: { type: String, required: true },
  wrappedKey: { type: String, required: true },
  wrappedKeyIv: { type: String, required: true },
  storagePath: { type: String, required: true },
  createdBy: { type: String, required: true },
  changeNote: { type: String, default: '' },
  createdAt: { type: String, default: () => new Date().toISOString() },
});
FileVersionSchema.index({ fileId: 1, versionNumber: 1 }, { unique: true });

// ==========================================
// 5. Share Interface & Schema
// ==========================================
export interface IShare {
  id: string;
  fileId: string;
  ownerId: string;
  recipientId: string;
  recipientEmail: string;
  // AES-GCM File Key re-wrapped with recipient's RSA-OAEP public key (base64)
  wrappedKeyForRecipient: string;
  permission: 'view' | 'download';
  createdAt: string;
}

export const ShareSchema = new Schema<IShare>({
  id: { type: String, required: true, unique: true, index: true },
  fileId: { type: String, required: true, index: true },
  ownerId: { type: String, required: true, index: true },
  recipientId: { type: String, required: true, index: true },
  recipientEmail: { type: String, required: true },
  wrappedKeyForRecipient: { type: String, required: true },
  permission: { type: String, enum: ['view', 'download'], default: 'download' },
  createdAt: { type: String, default: () => new Date().toISOString() },
});
ShareSchema.index({ fileId: 1, recipientId: 1 }, { unique: true });
ShareSchema.index({ recipientId: 1 });

// ==========================================
// 6. ActivityLog Interface & Schema
// ==========================================
export type ActivityAction =
  | 'user_registered'
  | 'user_login'
  | 'file_uploaded'
  | 'file_downloaded'
  | 'file_decrypted_preview'
  | 'file_renamed'
  | 'file_moved'
  | 'file_deleted'
  | 'file_restored_version'
  | 'file_shared'
  | 'share_revoked'
  | 'folder_created'
  | 'folder_renamed'
  | 'folder_deleted';

export interface IActivityLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: ActivityAction;
  targetType: 'file' | 'folder' | 'share' | 'user';
  targetId?: string;
  targetName?: string;
  details: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export const ActivityLogSchema = new Schema<IActivityLog>({
  id: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  action: { type: String, required: true, index: true },
  targetType: { type: String, required: true },
  targetId: { type: String },
  targetName: { type: String },
  details: { type: String, required: true },
  ipAddress: { type: String },
  userAgent: { type: String },
  createdAt: { type: String, default: () => new Date().toISOString(), index: true },
});
ActivityLogSchema.index({ userId: 1, createdAt: -1 });

// ==========================================
// 7. DownloadLog Interface & Schema
// ==========================================
export interface IDownloadLog {
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

export const DownloadLogSchema = new Schema<IDownloadLog>({
  id: { type: String, required: true, unique: true, index: true },
  fileId: { type: String, required: true, index: true },
  fileName: { type: String, required: true },
  versionNumber: { type: Number, required: true },
  userId: { type: String, required: true, index: true },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  mode: { type: String, enum: ['raw_encrypted', 'decrypted_client'], default: 'decrypted_client' },
  ipAddress: { type: String },
  userAgent: { type: String },
  downloadedAt: { type: String, default: () => new Date().toISOString(), index: true },
});
DownloadLogSchema.index({ fileId: 1, downloadedAt: -1 });

// Compile Mongoose models (used when connected to MongoDB)
export const UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export const FolderModel = mongoose.models.Folder || mongoose.model<IFolder>('Folder', FolderSchema);
export const FileModel = mongoose.models.File || mongoose.model<IVaultFile>('File', FileSchema);
export const FileVersionModel = mongoose.models.FileVersion || mongoose.model<IFileVersion>('FileVersion', FileVersionSchema);
export const ShareModel = mongoose.models.Share || mongoose.model<IShare>('Share', ShareSchema);
export const ActivityLogModel = mongoose.models.ActivityLog || mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
export const DownloadLogModel = mongoose.models.DownloadLog || mongoose.model<IDownloadLog>('DownloadLog', DownloadLogSchema);

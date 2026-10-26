import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { config } from '../config';
import {
  IUser,
  IFolder,
  IVaultFile,
  IFileVersion,
  IShare,
  IActivityLog,
  IDownloadLog,
  UserModel,
  FolderModel,
  FileModel,
  FileVersionModel,
  ShareModel,
  ActivityLogModel,
  DownloadLogModel,
} from '../models';

interface DatabaseData {
  users: IUser[];
  folders: IFolder[];
  files: IVaultFile[];
  fileVersions: IFileVersion[];
  shares: IShare[];
  activityLogs: IActivityLog[];
  downloadLogs: IDownloadLog[];
}

class UnifiedDataStore {
  private isMongoConnected = false;
  private filePath: string;
  private data: DatabaseData = {
    users: [],
    folders: [],
    files: [],
    fileVersions: [],
    shares: [],
    activityLogs: [],
    downloadLogs: [],
  };

  constructor() {
    if (!fs.existsSync(config.dataDir)) {
      fs.mkdirSync(config.dataDir, { recursive: true });
    }
    this.filePath = path.join(config.dataDir, 'vaultbox.json');
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = {
          users: parsed.users || [],
          folders: parsed.folders || [],
          files: parsed.files || [],
          fileVersions: parsed.fileVersions || [],
          shares: parsed.shares || [],
          activityLogs: parsed.activityLogs || [],
          downloadLogs: parsed.downloadLogs || [],
        };
      }
    } catch (err) {
      console.warn('[DataStore] Warning loading data file, initializing empty store:', err);
    }
  }

  private saveToDisk() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DataStore] Error saving to disk:', err);
    }
  }

  async connect(): Promise<void> {
    if (config.mongoUri) {
      try {
        console.log('[DataStore] Attempting connection to MongoDB at:', config.mongoUri);
        await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 2000 });
        this.isMongoConnected = true;
        console.log('[DataStore] Connected successfully to MongoDB!');
        return;
      } catch (err) {
        console.warn('[DataStore] MongoDB connection failed, falling back to local persistent store:', (err as Error).message);
        this.isMongoConnected = false;
      }
    } else {
      console.log('[DataStore] No MONGODB_URI provided. Running in high-reliability persistent local store mode.');
    }
  }

  get isMongo(): boolean {
    return this.isMongoConnected;
  }

  // ================= USERS =================
  async findUserByEmail(email: string): Promise<IUser | null> {
    if (this.isMongoConnected) {
      return (await UserModel.findOne({ email: email.toLowerCase().trim() }).lean()) as IUser | null;
    }
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim()) || null;
  }

  async findUserById(id: string): Promise<IUser | null> {
    if (this.isMongoConnected) {
      return (await UserModel.findOne({ id }).lean()) as IUser | null;
    }
    return this.data.users.find(u => u.id === id) || null;
  }

  async findUserByUsername(username: string): Promise<IUser | null> {
    if (this.isMongoConnected) {
      return (await UserModel.findOne({ username: username.trim() }).lean()) as IUser | null;
    }
    return this.data.users.find(u => u.username.toLowerCase() === username.toLowerCase().trim()) || null;
  }

  async listUsers(excludeId?: string): Promise<Pick<IUser, 'id' | 'email' | 'username' | 'rsaPublicKey'>[]> {
    if (this.isMongoConnected) {
      const q = excludeId ? { id: { $ne: excludeId } } : {};
      return (await UserModel.find(q).select('id email username rsaPublicKey').lean()) as any;
    }
    return this.data.users
      .filter(u => !excludeId || u.id !== excludeId)
      .map(u => ({ id: u.id, email: u.email, username: u.username, rsaPublicKey: u.rsaPublicKey }));
  }

  async createUser(user: IUser): Promise<IUser> {
    if (this.isMongoConnected) {
      const doc = new UserModel(user);
      await doc.save();
      return doc.toObject() as IUser;
    }
    this.data.users.push({ ...user });
    this.saveToDisk();
    return user;
  }

  async updateUser(id: string, updates: Partial<IUser>): Promise<IUser | null> {
    if (this.isMongoConnected) {
      return (await UserModel.findOneAndUpdate({ id }, { ...updates, updatedAt: new Date().toISOString() }, { new: true }).lean()) as IUser | null;
    }
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    this.data.users[idx] = { ...this.data.users[idx], ...updates, updatedAt: new Date().toISOString() };
    this.saveToDisk();
    return this.data.users[idx];
  }

  // ================= FOLDERS =================
  async listFolders(ownerId: string, parentId?: string | null): Promise<IFolder[]> {
    if (this.isMongoConnected) {
      const q: any = { ownerId };
      if (parentId !== undefined) q.parentId = parentId;
      return (await FolderModel.find(q).sort({ name: 1 }).lean()) as IFolder[];
    }
    return this.data.folders
      .filter(f => f.ownerId === ownerId && (parentId === undefined || f.parentId === parentId))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async findFolderById(id: string): Promise<IFolder | null> {
    if (this.isMongoConnected) {
      return (await FolderModel.findOne({ id }).lean()) as IFolder | null;
    }
    return this.data.folders.find(f => f.id === id) || null;
  }

  async createFolder(folder: IFolder): Promise<IFolder> {
    if (this.isMongoConnected) {
      const doc = new FolderModel(folder);
      await doc.save();
      return doc.toObject() as IFolder;
    }
    this.data.folders.push({ ...folder });
    this.saveToDisk();
    return folder;
  }

  async updateFolder(id: string, updates: Partial<IFolder>): Promise<IFolder | null> {
    if (this.isMongoConnected) {
      return (await FolderModel.findOneAndUpdate({ id }, { ...updates, updatedAt: new Date().toISOString() }, { new: true }).lean()) as IFolder | null;
    }
    const idx = this.data.folders.findIndex(f => f.id === id);
    if (idx === -1) return null;
    this.data.folders[idx] = { ...this.data.folders[idx], ...updates, updatedAt: new Date().toISOString() };
    this.saveToDisk();
    return this.data.folders[idx];
  }

  async deleteFolder(id: string): Promise<boolean> {
    if (this.isMongoConnected) {
      await FolderModel.deleteOne({ id });
      return true;
    }
    const lenBefore = this.data.folders.length;
    this.data.folders = this.data.folders.filter(f => f.id !== id);
    this.saveToDisk();
    return this.data.folders.length < lenBefore;
  }

  // ================= FILES =================
  async listFiles(ownerId: string, folderId?: string | null, includeDeleted = false): Promise<IVaultFile[]> {
    if (this.isMongoConnected) {
      const q: any = { ownerId };
      if (!includeDeleted) q.isDeleted = false;
      if (folderId !== undefined) q.folderId = folderId;
      return (await FileModel.find(q).sort({ createdAt: -1 }).lean()) as IVaultFile[];
    }
    return this.data.files
      .filter(f => f.ownerId === ownerId && (includeDeleted || !f.isDeleted) && (folderId === undefined || f.folderId === folderId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async findFileById(id: string): Promise<IVaultFile | null> {
    if (this.isMongoConnected) {
      return (await FileModel.findOne({ id }).lean()) as IVaultFile | null;
    }
    return this.data.files.find(f => f.id === id) || null;
  }

  async findFileByNameInFolder(ownerId: string, folderId: string | null, name: string): Promise<IVaultFile | null> {
    if (this.isMongoConnected) {
      return (await FileModel.findOne({ ownerId, folderId, name, isDeleted: false }).lean()) as IVaultFile | null;
    }
    return this.data.files.find(f => f.ownerId === ownerId && f.folderId === folderId && f.name.toLowerCase() === name.toLowerCase() && !f.isDeleted) || null;
  }

  async createFile(file: IVaultFile): Promise<IVaultFile> {
    if (this.isMongoConnected) {
      const doc = new FileModel(file);
      await doc.save();
      return doc.toObject() as IVaultFile;
    }
    this.data.files.push({ ...file });
    this.saveToDisk();
    return file;
  }

  async updateFile(id: string, updates: Partial<IVaultFile>): Promise<IVaultFile | null> {
    if (this.isMongoConnected) {
      return (await FileModel.findOneAndUpdate({ id }, { ...updates, updatedAt: new Date().toISOString() }, { new: true }).lean()) as IVaultFile | null;
    }
    const idx = this.data.files.findIndex(f => f.id === id);
    if (idx === -1) return null;
    this.data.files[idx] = { ...this.data.files[idx], ...updates, updatedAt: new Date().toISOString() };
    this.saveToDisk();
    return this.data.files[idx];
  }

  async deleteFile(id: string): Promise<boolean> {
    if (this.isMongoConnected) {
      await FileModel.deleteOne({ id });
      return true;
    }
    const lenBefore = this.data.files.length;
    this.data.files = this.data.files.filter(f => f.id !== id);
    this.saveToDisk();
    return this.data.files.length < lenBefore;
  }

  // ================= FILE VERSIONS =================
  async listFileVersions(fileId: string): Promise<IFileVersion[]> {
    if (this.isMongoConnected) {
      return (await FileVersionModel.find({ fileId }).sort({ versionNumber: -1 }).lean()) as IFileVersion[];
    }
    return this.data.fileVersions
      .filter(v => v.fileId === fileId)
      .sort((a, b) => b.versionNumber - a.versionNumber);
  }

  async findFileVersion(fileId: string, versionNumber: number): Promise<IFileVersion | null> {
    if (this.isMongoConnected) {
      return (await FileVersionModel.findOne({ fileId, versionNumber }).lean()) as IFileVersion | null;
    }
    return this.data.fileVersions.find(v => v.fileId === fileId && v.versionNumber === versionNumber) || null;
  }

  async createFileVersion(version: IFileVersion): Promise<IFileVersion> {
    if (this.isMongoConnected) {
      const doc = new FileVersionModel(version);
      await doc.save();
      return doc.toObject() as IFileVersion;
    }
    this.data.fileVersions.push({ ...version });
    this.saveToDisk();
    return version;
  }

  async deleteFileVersions(fileId: string): Promise<void> {
    if (this.isMongoConnected) {
      await FileVersionModel.deleteMany({ fileId });
      return;
    }
    this.data.fileVersions = this.data.fileVersions.filter(v => v.fileId !== fileId);
    this.saveToDisk();
  }

  // ================= SHARES =================
  async createShare(share: IShare): Promise<IShare> {
    if (this.isMongoConnected) {
      const doc = new ShareModel(share);
      await doc.save();
      return doc.toObject() as IShare;
    }
    // Remove duplicate if exists
    this.data.shares = this.data.shares.filter(s => !(s.fileId === share.fileId && s.recipientId === share.recipientId));
    this.data.shares.push({ ...share });
    this.saveToDisk();
    return share;
  }

  async findShare(fileId: string, recipientId: string): Promise<IShare | null> {
    if (this.isMongoConnected) {
      return (await ShareModel.findOne({ fileId, recipientId }).lean()) as IShare | null;
    }
    return this.data.shares.find(s => s.fileId === fileId && s.recipientId === recipientId) || null;
  }

  async listSharesByFile(fileId: string): Promise<IShare[]> {
    if (this.isMongoConnected) {
      return (await ShareModel.find({ fileId }).lean()) as IShare[];
    }
    return this.data.shares.filter(s => s.fileId === fileId);
  }

  async listSharesForRecipient(recipientId: string): Promise<IShare[]> {
    if (this.isMongoConnected) {
      return (await ShareModel.find({ recipientId }).sort({ createdAt: -1 }).lean()) as IShare[];
    }
    return this.data.shares
      .filter(s => s.recipientId === recipientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async deleteShare(id: string): Promise<boolean> {
    if (this.isMongoConnected) {
      await ShareModel.deleteOne({ id });
      return true;
    }
    const len = this.data.shares.length;
    this.data.shares = this.data.shares.filter(s => s.id !== id);
    this.saveToDisk();
    return this.data.shares.length < len;
  }

  async deleteSharesForFile(fileId: string): Promise<void> {
    if (this.isMongoConnected) {
      await ShareModel.deleteMany({ fileId });
      return;
    }
    this.data.shares = this.data.shares.filter(s => s.fileId !== fileId);
    this.saveToDisk();
  }

  // ================= ACTIVITY LOGS =================
  async logActivity(entry: IActivityLog): Promise<IActivityLog> {
    if (this.isMongoConnected) {
      const doc = new ActivityLogModel(entry);
      await doc.save();
      return doc.toObject() as IActivityLog;
    }
    this.data.activityLogs.unshift({ ...entry });
    // keep maximum 1000 logs in memory
    if (this.data.activityLogs.length > 1000) {
      this.data.activityLogs = this.data.activityLogs.slice(0, 1000);
    }
    this.saveToDisk();
    return entry;
  }

  async listActivityLogs(filter: {
    userId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<IActivityLog[]> {
    const limit = filter.limit || 100;
    if (this.isMongoConnected) {
      const q: any = {};
      if (filter.userId) q.userId = filter.userId;
      if (filter.action && filter.action !== 'all') q.action = filter.action;
      if (filter.startDate || filter.endDate) {
        q.createdAt = {};
        if (filter.startDate) q.createdAt.$gte = filter.startDate;
        if (filter.endDate) q.createdAt.$lte = filter.endDate;
      }
      return (await ActivityLogModel.find(q).sort({ createdAt: -1 }).limit(limit).lean()) as IActivityLog[];
    }
    return this.data.activityLogs
      .filter(l => {
        if (filter.userId && l.userId !== filter.userId) return false;
        if (filter.action && filter.action !== 'all' && l.action !== filter.action) return false;
        if (filter.startDate && l.createdAt < filter.startDate) return false;
        if (filter.endDate && l.createdAt > filter.endDate) return false;
        return true;
      })
      .slice(0, limit);
  }

  // ================= DOWNLOAD LOGS =================
  async logDownload(entry: IDownloadLog): Promise<IDownloadLog> {
    if (this.isMongoConnected) {
      const doc = new DownloadLogModel(entry);
      await doc.save();
      return doc.toObject() as IDownloadLog;
    }
    this.data.downloadLogs.unshift({ ...entry });
    if (this.data.downloadLogs.length > 1000) {
      this.data.downloadLogs = this.data.downloadLogs.slice(0, 1000);
    }
    this.saveToDisk();
    return entry;
  }

  async listDownloadLogs(fileId: string): Promise<IDownloadLog[]> {
    if (this.isMongoConnected) {
      return (await DownloadLogModel.find({ fileId }).sort({ downloadedAt: -1 }).lean()) as IDownloadLog[];
    }
    return this.data.downloadLogs
      .filter(l => l.fileId === fileId)
      .sort((a, b) => new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime());
  }

  // Raw counts for dashboard
  async getDashboardStats(userId: string) {
    const userFiles = await this.listFiles(userId, undefined, false);
    const userFolders = await this.listFolders(userId);
    const sharesForMe = await this.listSharesForRecipient(userId);
    const totalStorage = userFiles.reduce((sum, f) => sum + f.size, 0);

    return {
      fileCount: userFiles.length,
      folderCount: userFolders.length,
      sharedWithMeCount: sharesForMe.length,
      totalStorageBytes: totalStorage,
      storageQuotaBytes: 100 * 1024 * 1024, // 100MB demo quota
    };
  }
}

export const db = new UnifiedDataStore();

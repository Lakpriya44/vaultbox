import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from '../config';

// Ensure uploads directory exists
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

export interface StorageService {
  saveEncryptedBlob(buffer: Buffer, originalExt?: string): Promise<{ storageKey: string; size: number }>;
  readEncryptedBlob(storageKey: string): Promise<Buffer>;
  deleteEncryptedBlob(storageKey: string): Promise<boolean>;
  getBlobStream(storageKey: string): fs.ReadStream;
  blobExists(storageKey: string): boolean;
}

class LocalDiskStorageService implements StorageService {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private getFilePath(storageKey: string): string {
    // Sanitize to prevent path traversal
    const safeKey = path.basename(storageKey);
    return path.join(this.baseDir, safeKey);
  }

  async saveEncryptedBlob(buffer: Buffer, originalExt = 'enc'): Promise<{ storageKey: string; size: number }> {
    const randomHex = crypto.randomBytes(16).toString('hex');
    const storageKey = `enc_${Date.now()}_${randomHex}.${originalExt}`;
    const targetPath = this.getFilePath(storageKey);

    await fs.promises.writeFile(targetPath, buffer);
    return {
      storageKey,
      size: buffer.length,
    };
  }

  async readEncryptedBlob(storageKey: string): Promise<Buffer> {
    const targetPath = this.getFilePath(storageKey);
    if (!fs.existsSync(targetPath)) {
      throw new Error(`Encrypted blob not found: ${storageKey}`);
    }
    return await fs.promises.readFile(targetPath);
  }

  async deleteEncryptedBlob(storageKey: string): Promise<boolean> {
    const targetPath = this.getFilePath(storageKey);
    if (fs.existsSync(targetPath)) {
      await fs.promises.unlink(targetPath);
      return true;
    }
    return false;
  }

  getBlobStream(storageKey: string): fs.ReadStream {
    const targetPath = this.getFilePath(storageKey);
    if (!fs.existsSync(targetPath)) {
      throw new Error(`Encrypted blob not found: ${storageKey}`);
    }
    return fs.createReadStream(targetPath);
  }

  blobExists(storageKey: string): boolean {
    const targetPath = this.getFilePath(storageKey);
    return fs.existsSync(targetPath);
  }
}

export const storageService = new LocalDiskStorageService(config.uploadDir);

import { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db';
import { storageService } from '../services/storageService';
import { AuthenticatedRequest } from '../middleware/auth';
import { IVaultFile, IFileVersion } from '../models';

export class FileController {
  static async uploadFile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      if (!req.file) {
        res.status(400).json({ error: 'No encrypted file data uploaded.' });
        return;
      }

      const { name, originalName, mimeType, folderId, iv, wrappedKey, wrappedKeyIv, originalSize } = req.body;

      if (!name || !iv || !wrappedKey || !wrappedKeyIv) {
        res.status(400).json({ error: 'Missing encryption parameters (iv, wrappedKey, wrappedKeyIv, name).' });
        return;
      }

      const targetFolderId = folderId === 'null' || !folderId || folderId === 'root' ? null : folderId;

      // Check if folder exists and belongs to user if specified
      if (targetFolderId) {
        const folder = await db.findFolderById(targetFolderId);
        if (!folder || folder.ownerId !== user.id) {
          res.status(404).json({ error: 'Target folder does not exist or unauthorized.' });
          return;
        }
      }

      // Save encrypted blob to disk
      const { storageKey, size: encryptedSize } = await storageService.saveEncryptedBlob(req.file.buffer);

      // Check if file with same name exists in same folder -> Auto Versioning!
      const existingFile = await db.findFileByNameInFolder(user.id, targetFolderId, name);

      if (existingFile) {
        const newVersionNumber = (existingFile.activeVersion || 1) + 1;
        const newVersion: IFileVersion = {
          id: `ver_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
          fileId: existingFile.id,
          versionNumber: newVersionNumber,
          size: encryptedSize,
          originalSize: parseInt(originalSize || '0', 10) || encryptedSize,
          iv,
          wrappedKey,
          wrappedKeyIv,
          storagePath: storageKey,
          createdBy: user.id,
          changeNote: `Uploaded version ${newVersionNumber}`,
          createdAt: new Date().toISOString(),
        };

        await db.createFileVersion(newVersion);

        // Update active file pointer
        const updatedFile = await db.updateFile(existingFile.id, {
          activeVersion: newVersionNumber,
          size: encryptedSize,
          originalSize: parseInt(originalSize || '0', 10) || encryptedSize,
          iv,
          wrappedKey,
          wrappedKeyIv,
          storagePath: storageKey,
          mimeType: mimeType || existingFile.mimeType,
          originalName: originalName || existingFile.originalName,
        });

        // Update storage used
        const sizeDelta = encryptedSize - existingFile.size;
        await db.updateUser(user.id, {
          storageUsed: Math.max(0, user.storageUsed + sizeDelta),
        });

        await db.logActivity({
          id: `act_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
          userId: user.id,
          userName: user.username,
          userEmail: user.email,
          action: 'file_uploaded',
          targetType: 'file',
          targetId: existingFile.id,
          targetName: existingFile.name,
          details: `Uploaded new version v${newVersionNumber} of "${existingFile.name}" (AES-256-GCM encrypted, ${Math.round(encryptedSize / 1024)} KB).`,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          createdAt: new Date().toISOString(),
        });

        res.status(200).json({
          message: `File version ${newVersionNumber} created successfully.`,
          file: updatedFile,
          isNewVersion: true,
          version: newVersion,
        });
        return;
      }

      // Brand new file
      const fileId = `fil_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
      const newFile: IVaultFile = {
        id: fileId,
        name: name.trim(),
        originalName: originalName || name.trim(),
        mimeType: mimeType || 'application/octet-stream',
        size: encryptedSize,
        originalSize: parseInt(originalSize || '0', 10) || encryptedSize,
        folderId: targetFolderId,
        ownerId: user.id,
        iv,
        wrappedKey,
        wrappedKeyIv,
        activeVersion: 1,
        storagePath: storageKey,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.createFile(newFile);

      // Create v1 in file versions table
      const initialVersion: IFileVersion = {
        id: `ver_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
        fileId: newFile.id,
        versionNumber: 1,
        size: encryptedSize,
        originalSize: newFile.originalSize,
        iv,
        wrappedKey,
        wrappedKeyIv,
        storagePath: storageKey,
        createdBy: user.id,
        changeNote: 'Initial upload',
        createdAt: new Date().toISOString(),
      };
      await db.createFileVersion(initialVersion);

      // Update user's storage used
      await db.updateUser(user.id, {
        storageUsed: user.storageUsed + encryptedSize,
      });

      await db.logActivity({
        id: `act_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
        userId: user.id,
        userName: user.username,
        userEmail: user.email,
        action: 'file_uploaded',
        targetType: 'file',
        targetId: newFile.id,
        targetName: newFile.name,
        details: `Uploaded encrypted file "${newFile.name}" (AES-256-GCM, ${Math.round(encryptedSize / 1024)} KB).`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        createdAt: new Date().toISOString(),
      });

      res.status(201).json({
        message: 'File encrypted and uploaded successfully.',
        file: newFile,
        isNewVersion: false,
      });
    } catch (err: any) {
      console.error('[FileController.uploadFile] Error:', err);
      res.status(500).json({ error: 'Internal server error uploading file.' });
    }
  }

  static async listFiles(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const folderIdQuery = req.query.folderId;
      const search = (req.query.search as string)?.toLowerCase().trim();

      let folderId: string | null | undefined = undefined;
      if (folderIdQuery === 'root' || folderIdQuery === 'null') {
        folderId = null;
      } else if (typeof folderIdQuery === 'string') {
        folderId = folderIdQuery;
      }

      let files = await db.listFiles(user.id, folderId);

      if (search) {
        files = files.filter(f => f.name.toLowerCase().includes(search) || f.originalName.toLowerCase().includes(search));
      }

      res.json({ files });
    } catch (err: any) {
      console.error('[FileController.listFiles] Error:', err);
      res.status(500).json({ error: 'Internal server error listing files.' });
    }
  }

  static async getFile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { id } = req.params;

      const file = await db.findFileById(id);
      if (!file || file.isDeleted) {
        res.status(404).json({ error: 'File not found.' });
        return;
      }

      // Check ownership or share access
      let share = null;
      if (file.ownerId !== user.id) {
        share = await db.findShare(file.id, user.id);
        if (!share) {
          res.status(403).json({ error: 'Access denied. You do not own or have share access to this file.' });
          return;
        }
      }

      res.json({ file, share });
    } catch (err: any) {
      console.error('[FileController.getFile] Error:', err);
      res.status(500).json({ error: 'Internal server error fetching file.' });
    }
  }

  static async downloadFileBlob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { id } = req.params;
      const versionQuery = req.query.version;
      const mode = (req.query.mode as any) || 'decrypted_client';

      const file = await db.findFileById(id);
      if (!file || file.isDeleted) {
        res.status(404).json({ error: 'File not found.' });
        return;
      }

      // Check ownership or share access
      let share = null;
      if (file.ownerId !== user.id) {
        share = await db.findShare(file.id, user.id);
        if (!share) {
          res.status(403).json({ error: 'Access denied to download file.' });
          return;
        }
      }

      let storagePath = file.storagePath;
      let activeVer = file.activeVersion || 1;
      let iv = file.iv;
      let wrappedKey = file.wrappedKey;
      let wrappedKeyIv = file.wrappedKeyIv;

      if (versionQuery) {
        const verNum = parseInt(versionQuery as string, 10);
        const specificVer = await db.findFileVersion(file.id, verNum);
        if (specificVer) {
          storagePath = specificVer.storagePath;
          activeVer = specificVer.versionNumber;
          iv = specificVer.iv;
          wrappedKey = specificVer.wrappedKey;
          wrappedKeyIv = specificVer.wrappedKeyIv;
        }
      }

      if (!storageService.blobExists(storagePath)) {
        res.status(404).json({ error: 'Encrypted storage blob missing on server disk.' });
        return;
      }

      // Log download in DownloadLog
      await db.logDownload({
        id: `dlog_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
        fileId: file.id,
        fileName: file.name,
        versionNumber: activeVer,
        userId: user.id,
        userName: user.username,
        userEmail: user.email,
        mode,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        downloadedAt: new Date().toISOString(),
      });

      // Log in ActivityLog
      await db.logActivity({
        id: `act_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
        userId: user.id,
        userName: user.username,
        userEmail: user.email,
        action: 'file_downloaded',
        targetType: 'file',
        targetId: file.id,
        targetName: file.name,
        details: `Downloaded encrypted blob for "${file.name}" (version v${activeVer}, mode: ${mode}).`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        createdAt: new Date().toISOString(),
      });

      // Pass cryptographic metadata headers so client can decrypt seamlessly
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}.enc"`);
      res.setHeader('X-Vault-IV', iv);
      res.setHeader('X-Vault-Wrapped-Key', share ? share.wrappedKeyForRecipient : wrappedKey);
      res.setHeader('X-Vault-Wrapped-Key-IV', wrappedKeyIv);
      res.setHeader('X-Vault-Mime-Type', file.mimeType);
      res.setHeader('X-Vault-Version', activeVer.toString());
      res.setHeader('X-Vault-Original-Name', encodeURIComponent(file.originalName));
      if (share) {
        res.setHeader('X-Vault-Is-Shared', 'true');
      }

      // Pipe blob stream to client
      const stream = storageService.getBlobStream(storagePath);
      stream.pipe(res);
    } catch (err: any) {
      console.error('[FileController.downloadFileBlob] Error:', err);
      res.status(500).json({ error: 'Internal server error streaming file.' });
    }
  }

  static async renameFile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { newName } = req.body;

      if (!newName || !newName.trim()) {
        res.status(400).json({ error: 'New file name is required.' });
        return;
      }

      const file = await db.findFileById(id);
      if (!file || file.isDeleted) {
        res.status(404).json({ error: 'File not found.' });
        return;
      }

      if (file.ownerId !== user.id) {
        res.status(403).json({ error: 'Only the file owner can rename this file.' });
        return;
      }

      const oldName = file.name;
      const updated = await db.updateFile(id, { name: newName.trim() });

      await db.logActivity({
        id: `act_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
        userId: user.id,
        userName: user.username,
        userEmail: user.email,
        action: 'file_renamed',
        targetType: 'file',
        targetId: file.id,
        targetName: newName.trim(),
        details: `Renamed file from "${oldName}" to "${newName.trim()}".`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        createdAt: new Date().toISOString(),
      });

      res.json({ message: 'File renamed successfully.', file: updated });
    } catch (err: any) {
      console.error('[FileController.renameFile] Error:', err);
      res.status(500).json({ error: 'Internal server error renaming file.' });
    }
  }

  static async moveFile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { targetFolderId } = req.body;

      const file = await db.findFileById(id);
      if (!file || file.isDeleted) {
        res.status(404).json({ error: 'File not found.' });
        return;
      }

      if (file.ownerId !== user.id) {
        res.status(403).json({ error: 'Only the file owner can move this file.' });
        return;
      }

      const finalFolderId = targetFolderId === 'root' || !targetFolderId || targetFolderId === 'null' ? null : targetFolderId;
      let targetFolderName = 'Root';

      if (finalFolderId) {
        const folder = await db.findFolderById(finalFolderId);
        if (!folder || folder.ownerId !== user.id) {
          res.status(404).json({ error: 'Target folder does not exist or unauthorized.' });
          return;
        }
        targetFolderName = folder.name;
      }

      const updated = await db.updateFile(id, { folderId: finalFolderId });

      await db.logActivity({
        id: `act_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
        userId: user.id,
        userName: user.username,
        userEmail: user.email,
        action: 'file_moved',
        targetType: 'file',
        targetId: file.id,
        targetName: file.name,
        details: `Moved file "${file.name}" to folder "${targetFolderName}".`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        createdAt: new Date().toISOString(),
      });

      res.json({ message: 'File moved successfully.', file: updated });
    } catch (err: any) {
      console.error('[FileController.moveFile] Error:', err);
      res.status(500).json({ error: 'Internal server error moving file.' });
    }
  }

  static async deleteFile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { id } = req.params;

      const file = await db.findFileById(id);
      if (!file) {
        res.status(404).json({ error: 'File not found.' });
        return;
      }

      if (file.ownerId !== user.id) {
        res.status(403).json({ error: 'Only the file owner can delete this file.' });
        return;
      }

      // Get all versions to delete their blobs
      const versions = await db.listFileVersions(file.id);
      for (const ver of versions) {
        await storageService.deleteEncryptedBlob(ver.storagePath);
      }
      await storageService.deleteEncryptedBlob(file.storagePath);

      // Delete versions, shares, file records
      await db.deleteFileVersions(file.id);
      await db.deleteSharesForFile(file.id);
      await db.deleteFile(file.id);

      // Update storage used
      await db.updateUser(user.id, {
        storageUsed: Math.max(0, user.storageUsed - file.size),
      });

      await db.logActivity({
        id: `act_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
        userId: user.id,
        userName: user.username,
        userEmail: user.email,
        action: 'file_deleted',
        targetType: 'file',
        targetId: file.id,
        targetName: file.name,
        details: `Permanently deleted encrypted file "${file.name}" and all historical versions.`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        createdAt: new Date().toISOString(),
      });

      res.json({ message: 'File and historical versions deleted successfully.' });
    } catch (err: any) {
      console.error('[FileController.deleteFile] Error:', err);
      res.status(500).json({ error: 'Internal server error deleting file.' });
    }
  }

  static async listVersions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { id } = req.params;

      const file = await db.findFileById(id);
      if (!file || file.isDeleted) {
        res.status(404).json({ error: 'File not found.' });
        return;
      }

      // Check ownership or share access
      if (file.ownerId !== user.id) {
        const share = await db.findShare(file.id, user.id);
        if (!share) {
          res.status(403).json({ error: 'Access denied.' });
          return;
        }
      }

      const versions = await db.listFileVersions(file.id);
      res.json({ versions, activeVersion: file.activeVersion });
    } catch (err: any) {
      console.error('[FileController.listVersions] Error:', err);
      res.status(500).json({ error: 'Internal server error listing file versions.' });
    }
  }

  static async restoreVersion(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { versionNumber } = req.body;

      const file = await db.findFileById(id);
      if (!file || file.isDeleted) {
        res.status(404).json({ error: 'File not found.' });
        return;
      }

      if (file.ownerId !== user.id) {
        res.status(403).json({ error: 'Only the file owner can restore versions.' });
        return;
      }

      const targetVersion = await db.findFileVersion(file.id, parseInt(versionNumber, 10));
      if (!targetVersion) {
        res.status(404).json({ error: `Version ${versionNumber} not found.` });
        return;
      }

      const updated = await db.updateFile(file.id, {
        activeVersion: targetVersion.versionNumber,
        size: targetVersion.size,
        originalSize: targetVersion.originalSize,
        iv: targetVersion.iv,
        wrappedKey: targetVersion.wrappedKey,
        wrappedKeyIv: targetVersion.wrappedKeyIv,
        storagePath: targetVersion.storagePath,
      });

      await db.logActivity({
        id: `act_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
        userId: user.id,
        userName: user.username,
        userEmail: user.email,
        action: 'file_restored_version',
        targetType: 'file',
        targetId: file.id,
        targetName: file.name,
        details: `Restored active version of "${file.name}" to v${targetVersion.versionNumber}.`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        createdAt: new Date().toISOString(),
      });

      res.json({ message: `Restored active file to version v${targetVersion.versionNumber}.`, file: updated });
    } catch (err: any) {
      console.error('[FileController.restoreVersion] Error:', err);
      res.status(500).json({ error: 'Internal server error restoring file version.' });
    }
  }
}

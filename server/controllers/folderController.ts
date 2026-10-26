import { Response } from 'express';
import crypto from 'crypto';
import { db } from '../db';
import { AuthenticatedRequest } from '../middleware/auth';
import { IFolder } from '../models';

export class FolderController {
  static async listFolders(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const parentIdQuery = req.query.parentId;

      let parentId: string | null | undefined = undefined;
      if (parentIdQuery === 'root' || parentIdQuery === 'null') {
        parentId = null;
      } else if (typeof parentIdQuery === 'string') {
        parentId = parentIdQuery;
      }

      // If no parentId queried, return all user's folders for the tree view
      const folders = await db.listFolders(user.id, parentId);
      res.json({ folders });
    } catch (err: any) {
      console.error('[FolderController.listFolders] Error:', err);
      res.status(500).json({ error: 'Internal server error listing folders.' });
    }
  }

  static async createFolder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { name, parentId, color } = req.body;

      if (!name || !name.trim()) {
        res.status(400).json({ error: 'Folder name is required.' });
        return;
      }

      const targetParentId = parentId === 'root' || !parentId || parentId === 'null' ? null : parentId;

      if (targetParentId) {
        const parent = await db.findFolderById(targetParentId);
        if (!parent || parent.ownerId !== user.id) {
          res.status(404).json({ error: 'Parent folder does not exist or unauthorized.' });
          return;
        }
      }

      const folderId = `fld_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
      const newFolder: IFolder = {
        id: folderId,
        name: name.trim(),
        parentId: targetParentId,
        ownerId: user.id,
        color: color || '#3b82f6',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.createFolder(newFolder);

      await db.logActivity({
        id: `act_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
        userId: user.id,
        userName: user.username,
        userEmail: user.email,
        action: 'folder_created',
        targetType: 'folder',
        targetId: newFolder.id,
        targetName: newFolder.name,
        details: `Created folder "${newFolder.name}".`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        createdAt: new Date().toISOString(),
      });

      res.status(201).json({ message: 'Folder created successfully.', folder: newFolder });
    } catch (err: any) {
      console.error('[FolderController.createFolder] Error:', err);
      res.status(500).json({ error: 'Internal server error creating folder.' });
    }
  }

  static async renameFolder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { name, color } = req.body;

      if (!name || !name.trim()) {
        res.status(400).json({ error: 'Folder name is required.' });
        return;
      }

      const folder = await db.findFolderById(id);
      if (!folder || folder.ownerId !== user.id) {
        res.status(404).json({ error: 'Folder not found or unauthorized.' });
        return;
      }

      const oldName = folder.name;
      const updated = await db.updateFolder(id, {
        name: name.trim(),
        ...(color ? { color } : {}),
      });

      await db.logActivity({
        id: `act_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
        userId: user.id,
        userName: user.username,
        userEmail: user.email,
        action: 'folder_renamed',
        targetType: 'folder',
        targetId: id,
        targetName: name.trim(),
        details: `Renamed folder from "${oldName}" to "${name.trim()}".`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        createdAt: new Date().toISOString(),
      });

      res.json({ message: 'Folder updated successfully.', folder: updated });
    } catch (err: any) {
      console.error('[FolderController.renameFolder] Error:', err);
      res.status(500).json({ error: 'Internal server error updating folder.' });
    }
  }

  static async deleteFolder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { id } = req.params;

      const folder = await db.findFolderById(id);
      if (!folder || folder.ownerId !== user.id) {
        res.status(404).json({ error: 'Folder not found or unauthorized.' });
        return;
      }

      // Check if folder contains files or child folders
      const childFolders = await db.listFolders(user.id, id);
      const childFiles = await db.listFiles(user.id, id);

      if (childFolders.length > 0 || childFiles.length > 0) {
        // Move contents to parent or root to avoid orphaned files
        for (const cf of childFiles) {
          await db.updateFile(cf.id, { folderId: folder.parentId });
        }
        for (const cf of childFolders) {
          await db.updateFolder(cf.id, { parentId: folder.parentId });
        }
      }

      await db.deleteFolder(id);

      await db.logActivity({
        id: `act_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
        userId: user.id,
        userName: user.username,
        userEmail: user.email,
        action: 'folder_deleted',
        targetType: 'folder',
        targetId: id,
        targetName: folder.name,
        details: `Deleted folder "${folder.name}". Items were moved to parent folder.`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        createdAt: new Date().toISOString(),
      });

      res.json({ message: 'Folder deleted successfully. Nested items preserved in parent directory.' });
    } catch (err: any) {
      console.error('[FolderController.deleteFolder] Error:', err);
      res.status(500).json({ error: 'Internal server error deleting folder.' });
    }
  }
}

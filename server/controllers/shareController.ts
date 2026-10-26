import { Response } from 'express';
import crypto from 'crypto';
import { db } from '../db';
import { AuthenticatedRequest } from '../middleware/auth';
import { IShare } from '../models';

export class ShareController {
  static async createShare(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { fileId, recipientEmail, recipientId, wrappedKeyForRecipient, permission } = req.body;

      if (!fileId || (!recipientEmail && !recipientId) || !wrappedKeyForRecipient) {
        res.status(400).json({ error: 'fileId, recipient info, and wrappedKeyForRecipient are required.' });
        return;
      }

      const file = await db.findFileById(fileId);
      if (!file || file.isDeleted) {
        res.status(404).json({ error: 'File not found.' });
        return;
      }

      if (file.ownerId !== user.id) {
        res.status(403).json({ error: 'Only the file owner can share this file.' });
        return;
      }

      let recipient = null;
      if (recipientId) {
        recipient = await db.findUserById(recipientId);
      } else if (recipientEmail) {
        recipient = await db.findUserByEmail(recipientEmail);
      }

      if (!recipient) {
        res.status(404).json({ error: 'Recipient user not found.' });
        return;
      }

      if (recipient.id === user.id) {
        res.status(400).json({ error: 'You cannot share a file with yourself.' });
        return;
      }

      const shareId = `shr_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
      const newShare: IShare = {
        id: shareId,
        fileId: file.id,
        ownerId: user.id,
        recipientId: recipient.id,
        recipientEmail: recipient.email,
        wrappedKeyForRecipient,
        permission: permission === 'view' ? 'view' : 'download',
        createdAt: new Date().toISOString(),
      };

      await db.createShare(newShare);

      await db.logActivity({
        id: `act_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
        userId: user.id,
        userName: user.username,
        userEmail: user.email,
        action: 'file_shared',
        targetType: 'share',
        targetId: file.id,
        targetName: file.name,
        details: `Shared encrypted file "${file.name}" with ${recipient.email} (Permission: ${newShare.permission}, RSA-wrapped key).`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        createdAt: new Date().toISOString(),
      });

      res.status(201).json({ message: 'File shared successfully.', share: newShare });
    } catch (err: any) {
      console.error('[ShareController.createShare] Error:', err);
      res.status(500).json({ error: 'Internal server error sharing file.' });
    }
  }

  static async listSharedWithMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const shares = await db.listSharesForRecipient(user.id);

      // Hydrate with file details and owner details
      const sharedItems = [];
      for (const s of shares) {
        const file = await db.findFileById(s.fileId);
        if (file && !file.isDeleted) {
          const owner = await db.findUserById(s.ownerId);
          sharedItems.push({
            shareId: s.id,
            permission: s.permission,
            sharedAt: s.createdAt,
            wrappedKeyForRecipient: s.wrappedKeyForRecipient,
            owner: {
              id: owner?.id,
              username: owner?.username || 'Unknown',
              email: owner?.email || 'Unknown',
            },
            file: {
              id: file.id,
              name: file.name,
              originalName: file.originalName,
              mimeType: file.mimeType,
              size: file.size,
              originalSize: file.originalSize,
              iv: file.iv,
              wrappedKeyIv: file.wrappedKeyIv,
              activeVersion: file.activeVersion,
              createdAt: file.createdAt,
            },
          });
        }
      }

      res.json({ sharedItems });
    } catch (err: any) {
      console.error('[ShareController.listSharedWithMe] Error:', err);
      res.status(500).json({ error: 'Internal server error listing shared files.' });
    }
  }

  static async listFileShares(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { fileId } = req.params;

      const file = await db.findFileById(fileId);
      if (!file || file.isDeleted) {
        res.status(404).json({ error: 'File not found.' });
        return;
      }

      if (file.ownerId !== user.id) {
        res.status(403).json({ error: 'Only the owner can view share settings for this file.' });
        return;
      }

      const shares = await db.listSharesByFile(fileId);
      res.json({ shares });
    } catch (err: any) {
      console.error('[ShareController.listFileShares] Error:', err);
      res.status(500).json({ error: 'Internal server error fetching shares.' });
    }
  }

  static async revokeShare(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { id } = req.params;

      // Find share
      const shares = await db.listSharesByFile(id); // could be by share id or file
      // Check directly
      const success = await db.deleteShare(id);
      if (!success) {
        res.status(404).json({ error: 'Share record not found.' });
        return;
      }

      await db.logActivity({
        id: `act_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
        userId: user.id,
        userName: user.username,
        userEmail: user.email,
        action: 'share_revoked',
        targetType: 'share',
        targetId: id,
        details: 'Revoked shared access permissions for file.',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        createdAt: new Date().toISOString(),
      });

      res.json({ message: 'Share access revoked successfully.' });
    } catch (err: any) {
      console.error('[ShareController.revokeShare] Error:', err);
      res.status(500).json({ error: 'Internal server error revoking share.' });
    }
  }
}

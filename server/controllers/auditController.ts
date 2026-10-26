import { Response } from 'express';
import { db } from '../db';
import { AuthenticatedRequest } from '../middleware/auth';

export class AuditController {
  static async listActivityLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const action = req.query.action as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const limit = parseInt(req.query.limit as string, 10) || 100;

      const logs = await db.listActivityLogs({
        userId: user.id,
        action,
        startDate,
        endDate,
        limit,
      });

      res.json({ logs });
    } catch (err: any) {
      console.error('[AuditController.listActivityLogs] Error:', err);
      res.status(500).json({ error: 'Internal server error fetching activity logs.' });
    }
  }

  static async exportActivityCsv(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const action = req.query.action as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      const logs = await db.listActivityLogs({
        userId: user.id,
        action,
        startDate,
        endDate,
        limit: 1000,
      });

      const header = ['Timestamp (UTC)', 'User Email', 'Action', 'Target Type', 'Target Name', 'Details', 'IP Address'];
      const escapeCsv = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;

      const rows = logs.map(l => [
        escapeCsv(l.createdAt),
        escapeCsv(l.userEmail),
        escapeCsv(l.action),
        escapeCsv(l.targetType),
        escapeCsv(l.targetName || 'N/A'),
        escapeCsv(l.details),
        escapeCsv(l.ipAddress || 'Unknown'),
      ]);

      const csvContent = [header.join(','), ...rows.map(r => r.join(','))].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="vaultbox-audit-${Date.now()}.csv"`);
      res.send(csvContent);
    } catch (err: any) {
      console.error('[AuditController.exportActivityCsv] Error:', err);
      res.status(500).json({ error: 'Internal server error generating CSV.' });
    }
  }

  static async listDownloadLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { fileId } = req.params;

      const file = await db.findFileById(fileId);
      if (!file || file.isDeleted) {
        res.status(404).json({ error: 'File not found.' });
        return;
      }

      if (file.ownerId !== user.id) {
        res.status(403).json({ error: 'Only the file owner can view download history.' });
        return;
      }

      const logs = await db.listDownloadLogs(fileId);
      res.json({ logs });
    } catch (err: any) {
      console.error('[AuditController.listDownloadLogs] Error:', err);
      res.status(500).json({ error: 'Internal server error fetching download logs.' });
    }
  }

  static async getDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const stats = await db.getDashboardStats(user.id);
      const recentFiles = (await db.listFiles(user.id)).slice(0, 5);
      const recentLogs = await db.listActivityLogs({ userId: user.id, limit: 7 });

      res.json({
        stats,
        recentFiles,
        recentLogs,
      });
    } catch (err: any) {
      console.error('[AuditController.getDashboard] Error:', err);
      res.status(500).json({ error: 'Internal server error fetching dashboard data.' });
    }
  }
}

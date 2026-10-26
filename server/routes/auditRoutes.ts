import { Router } from 'express';
import { AuditController } from '../controllers/auditController';
import { authenticateJwt } from '../middleware/auth';

const router = Router();

router.use(authenticateJwt);

router.get('/activity', AuditController.listActivityLogs);
router.get('/activity/export-csv', AuditController.exportActivityCsv);
router.get('/download-history/:fileId', AuditController.listDownloadLogs);
router.get('/dashboard', AuditController.getDashboard);

export default router;

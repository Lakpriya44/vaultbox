import { Router } from 'express';
import { ShareController } from '../controllers/shareController';
import { authenticateJwt } from '../middleware/auth';

const router = Router();

router.use(authenticateJwt);

router.post('/', ShareController.createShare);
router.get('/shared-with-me', ShareController.listSharedWithMe);
router.get('/file/:fileId', ShareController.listFileShares);
router.delete('/:id', ShareController.revokeShare);

export default router;

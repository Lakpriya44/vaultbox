import { Router } from 'express';
import { FileController } from '../controllers/fileController';
import { authenticateJwt } from '../middleware/auth';
import { uploadMiddleware } from '../middleware/upload';

const router = Router();

router.use(authenticateJwt);

router.post('/upload', uploadMiddleware.single('file'), FileController.uploadFile);
router.get('/', FileController.listFiles);
router.get('/:id', FileController.getFile);
router.get('/:id/download', FileController.downloadFileBlob);
router.patch('/:id/rename', FileController.renameFile);
router.patch('/:id/move', FileController.moveFile);
router.delete('/:id', FileController.deleteFile);
router.get('/:id/versions', FileController.listVersions);
router.post('/:id/restore-version', FileController.restoreVersion);

export default router;

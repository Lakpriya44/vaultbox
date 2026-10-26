import { Router } from 'express';
import { FolderController } from '../controllers/folderController';
import { authenticateJwt } from '../middleware/auth';

const router = Router();

router.use(authenticateJwt);

router.get('/', FolderController.listFolders);
router.post('/', FolderController.createFolder);
router.patch('/:id', FolderController.renameFolder);
router.delete('/:id', FolderController.deleteFolder);

export default router;

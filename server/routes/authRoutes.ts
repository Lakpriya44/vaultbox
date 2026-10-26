import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateJwt } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', authRateLimiter, AuthController.register);
router.post('/login', authRateLimiter, AuthController.login);
router.get('/me', authenticateJwt, AuthController.getMe);
router.get('/public-key', authenticateJwt, AuthController.lookupPublicKey);
router.get('/users', authenticateJwt, AuthController.listUsersForShare);
router.post('/change-password', authenticateJwt, AuthController.changePassword);

export default router;

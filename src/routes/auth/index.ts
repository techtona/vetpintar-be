import { Router } from 'express';
import { authController } from '../../controllers/authController';
import { validateBody } from '../../middleware/validation';
import { loginSchema, registerSchema, refreshTokenSchema, googleLoginSchema } from './authValidation';
import { authLimiter } from './authRateLimit';
import { authenticateToken } from '../../middleware/auth';

const router = Router();

// Apply rate limiting to all auth routes
router.use(authLimiter);

router.post('/login', validateBody(loginSchema), authController.login);
router.post('/register', validateBody(registerSchema), authController.register);
router.post('/refresh', validateBody(refreshTokenSchema), authController.refreshToken);
router.post('/logout', authController.logout);
router.get('/me', authenticateToken, authController.getCurrentUser);
router.post('/google-login', validateBody(googleLoginSchema), authController.googleLogin);

export { router as authRoutes };
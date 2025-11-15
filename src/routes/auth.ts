import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from '../controllers/authController';
import { validateBody } from '../middleware/zodValidation';
import { loginSchema, registerSchema, refreshTokenSchema, googleAuthSchema } from '../dtos/auth.dto';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Rate limiting for sensitive auth routes (login, register)
const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Relaxed rate limiting for token validation
const meEndpointLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', strictAuthLimiter, validateBody(loginSchema), authController.login);
router.post('/register', strictAuthLimiter, validateBody(registerSchema), authController.register);
router.post('/refresh', validateBody(refreshTokenSchema), authController.refreshToken);
router.post('/logout', authController.logout);
router.get('/me', meEndpointLimiter, authenticateToken, authController.getCurrentUser);
router.post('/google-login', strictAuthLimiter, validateBody(googleAuthSchema), authController.googleLogin);

export { router as authRoutes };

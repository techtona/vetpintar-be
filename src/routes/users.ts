import { Router } from 'express';
import { userController } from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/zodValidation';
import { updateUserSchema, userQuerySchema } from '../dtos/user.dto';

const router = Router();

// Apply authentication to all user routes
router.use(authenticateToken);

router.get('/', validateQuery(userQuerySchema), userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.put('/:id', validateBody(updateUserSchema), userController.updateUser);
router.delete('/:id', userController.deleteUser);

// Clinic-specific user routes
router.get('/clinic/:clinicId', userController.getClinicUsers);

export { router as userRoutes };

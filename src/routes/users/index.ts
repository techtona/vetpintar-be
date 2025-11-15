import { Router } from 'express';
import { userController } from '../../controllers/userController';
import { authenticateToken } from '../../middleware/auth';

const router = Router();

// Apply authentication to all user routes
router.use(authenticateToken);

router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

// Clinic-specific user routes
router.get('/clinic/:clinicId', userController.getClinicUsers);

export { router as userRoutes };
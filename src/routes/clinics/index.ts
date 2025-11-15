import { Router } from 'express';
import { clinicController } from '../../controllers/clinicController';
import { authenticateToken } from '../../middleware/auth';

const router = Router();

// Public routes
router.get('/', clinicController.getAllClinics);
router.get('/:id', clinicController.getClinicById);

// Protected routes
router.use(authenticateToken);

router.get('/my', clinicController.getMyClinics);
router.post('/', clinicController.createClinic);
router.put('/:id', clinicController.updateClinic);
router.delete('/:id', clinicController.deleteClinic);

export { router as clinicRoutes };
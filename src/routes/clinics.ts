import { Router } from 'express';
import { clinicController } from '../controllers/clinicController';
import { authenticateToken } from '../middleware/auth';
import { validateBody } from '../middleware/zodValidation';
import { createClinicSchema, updateClinicSchema } from '../dtos/clinic.dto';

const router = Router();

// Public routes
router.get('/', clinicController.getAllClinics);
router.get('/:id', clinicController.getClinicById);

// Protected routes
router.use(authenticateToken);

router.get('/my', clinicController.getMyClinics);
router.post('/', validateBody(createClinicSchema), clinicController.createClinic);
router.put('/:id', validateBody(updateClinicSchema), clinicController.updateClinic);
router.delete('/:id', clinicController.deleteClinic);

export { router as clinicRoutes };

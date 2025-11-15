import { Router } from 'express';
import { patientController } from '../../controllers/patientController';
import { authenticateToken } from '../../middleware/auth';
import { validateBody } from '../../middleware/validation';

const router = Router();

// Apply authentication to all patient routes
router.use(authenticateToken);

router.get('/', patientController.getAllPatients);
router.get('/:id', patientController.getPatientById);
router.post('/', patientController.createPatient);
router.put('/:id', patientController.updatePatient);
router.delete('/:id', patientController.deletePatient);

export { router as patientRoutes };
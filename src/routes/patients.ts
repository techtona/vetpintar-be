import { Router } from 'express';
import { patientController } from '../controllers/patientController';
import { authenticateToken } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/zodValidation';
import { createPatientSchema, updatePatientSchema, patientQuerySchema } from '../dtos/patient.dto';

const router = Router();

// Apply authentication to all patient routes
router.use(authenticateToken);

router.get('/', validateQuery(patientQuerySchema), patientController.getAllPatients);
router.get('/:id', patientController.getPatientById);
router.post('/', validateBody(createPatientSchema), patientController.createPatient);
router.put('/:id', validateBody(updatePatientSchema), patientController.updatePatient);
router.delete('/:id', patientController.deletePatient);

export { router as patientRoutes };

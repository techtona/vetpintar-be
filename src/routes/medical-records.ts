import { Router } from 'express';
import { medicalRecordController } from '../controllers/medicalRecordController';
import { authenticateToken } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/zodValidation';
import {
  createMedicalRecordSchema,
  updateMedicalRecordSchema,
  medicalRecordQuerySchema
} from '../dtos/medical-record.dto';

const router = Router();

// Apply authentication to all medical record routes
router.use(authenticateToken);

router.get('/', validateQuery(medicalRecordQuerySchema), medicalRecordController.getAllMedicalRecords);
router.get('/:id', medicalRecordController.getMedicalRecordById);
router.post('/', validateBody(createMedicalRecordSchema), medicalRecordController.createMedicalRecord);
router.put('/:id', validateBody(updateMedicalRecordSchema), medicalRecordController.updateMedicalRecord);
router.delete('/:id', medicalRecordController.deleteMedicalRecord);

// Patient-specific medical record routes
router.get('/patient/:patientId', medicalRecordController.getPatientMedicalRecords);

export { router as medicalRecordRoutes };

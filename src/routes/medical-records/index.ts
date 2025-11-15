import { Router } from 'express';
import { medicalRecordController } from '../../controllers/medicalRecordController';
import { authenticateToken } from '../../middleware/auth';

const router = Router();

// Apply authentication to all medical record routes
router.use(authenticateToken);

router.get('/', medicalRecordController.getAllMedicalRecords);
router.get('/:id', medicalRecordController.getMedicalRecordById);
router.post('/', medicalRecordController.createMedicalRecord);
router.put('/:id', medicalRecordController.updateMedicalRecord);
router.delete('/:id', medicalRecordController.deleteMedicalRecord);

// Patient-specific medical record routes
router.get('/patient/:patientId', medicalRecordController.getPatientMedicalRecords);

export { router as medicalRecordRoutes };
import { z } from 'zod';

// Create Medical Record
export const createMedicalRecordSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
  veterinarianId: z.string().uuid('Invalid veterinarian ID'),
  visitDate: z.coerce.date(),
  chiefComplaint: z.string().min(1, 'Chief complaint is required'),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
  prescription: z.string().optional(),
  notes: z.string().optional(),
  weight: z.number().positive().optional(),
  temperature: z.number().positive().optional(),
  status: z.enum(['OUTPATIENT', 'INPATIENT', 'DISCHARGED', 'REFERRED']).default('OUTPATIENT'),
  totalAmount: z.number().nonnegative().optional()
});

export type CreateMedicalRecordDto = z.infer<typeof createMedicalRecordSchema>;

// Update Medical Record
export const updateMedicalRecordSchema = createMedicalRecordSchema.partial();

export type UpdateMedicalRecordDto = z.infer<typeof updateMedicalRecordSchema>;

// Query
export const medicalRecordQuerySchema = z.object({
  patientId: z.string().uuid().optional(),
  veterinarianId: z.string().uuid().optional(),
  status: z.enum(['OUTPATIENT', 'INPATIENT', 'DISCHARGED', 'REFERRED']).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional()
});

export type MedicalRecordQueryDto = z.infer<typeof medicalRecordQuerySchema>;

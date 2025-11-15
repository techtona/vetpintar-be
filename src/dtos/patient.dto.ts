import { z } from 'zod';

// Create Patient
export const createPatientSchema = z.object({
  name: z.string().min(1, 'Patient name is required'),
  species: z.string().min(1, 'Species is required'),
  breed: z.string().optional(),
  gender: z.string().optional(),
  birthDate: z.coerce.date().optional(),
  color: z.string().optional(),
  microchipId: z.string().optional(),
  photoUrl: z.string().url().optional(),
  ownerId: z.string().uuid('Invalid owner ID')
});

export type CreatePatientDto = z.infer<typeof createPatientSchema>;

// Update Patient
export const updatePatientSchema = createPatientSchema.partial();

export type UpdatePatientDto = z.infer<typeof updatePatientSchema>;

// Query/Filter
export const patientQuerySchema = z.object({
  species: z.string().optional(),
  breed: z.string().optional(),
  gender: z.string().optional(),
  ownerId: z.string().uuid().optional(),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional()
});

export type PatientQueryDto = z.infer<typeof patientQuerySchema>;

import { z } from 'zod';

// Create Clinic
export const createClinicSchema = z.object({
  name: z.string().min(1, 'Clinic name is required'),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  logoUrl: z.string().url().optional()
});

export type CreateClinicDto = z.infer<typeof createClinicSchema>;

// Update Clinic
export const updateClinicSchema = createClinicSchema.partial().extend({
  isActive: z.boolean().optional(),
  subscriptionStatus: z.enum(['TRIAL', 'ACTIVE', 'EXPIRED', 'SUSPENDED']).optional()
});

export type UpdateClinicDto = z.infer<typeof updateClinicSchema>;

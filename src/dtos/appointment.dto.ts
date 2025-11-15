import { z } from 'zod';

// Create Appointment
export const createAppointmentSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
  veterinarianId: z.string().uuid('Invalid veterinarian ID').optional(),
  appointmentDate: z.coerce.date(),
  appointmentTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  duration: z.number().int().positive().default(30),
  type: z.string().min(1, 'Appointment type is required'),
  reason: z.string().optional(),
  notes: z.string().optional()
});

export type CreateAppointmentDto = z.infer<typeof createAppointmentSchema>;

// Update Appointment
export const updateAppointmentSchema = createAppointmentSchema.partial();

export type UpdateAppointmentDto = z.infer<typeof updateAppointmentSchema>;

// Update Status
export const updateAppointmentStatusSchema = z.object({
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
});

export type UpdateAppointmentStatusDto = z.infer<typeof updateAppointmentStatusSchema>;

// Query
export const appointmentQuerySchema = z.object({
  patientId: z.string().uuid().optional(),
  veterinarianId: z.string().uuid().optional(),
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional()
});

export type AppointmentQueryDto = z.infer<typeof appointmentQuerySchema>;

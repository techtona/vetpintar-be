import { z } from 'zod';

// Update User
export const updateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
  role: z.enum(['OWNER', 'VETERINARIAN', 'ADMIN', 'STAFF', 'CUSTOMER', 'GUEST', 'SUPER_ADMIN']).optional()
});

export type UpdateUserDto = z.infer<typeof updateUserSchema>;

// Query
export const userQuerySchema = z.object({
  role: z.enum(['OWNER', 'VETERINARIAN', 'ADMIN', 'STAFF', 'CUSTOMER', 'GUEST', 'SUPER_ADMIN']).optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional()
});

export type UserQueryDto = z.infer<typeof userQuerySchema>;

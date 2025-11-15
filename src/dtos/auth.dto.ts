import { z } from 'zod';

// Login
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export type LoginDto = z.infer<typeof loginSchema>;

// Register
export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  role: z.enum(['OWNER', 'VETERINARIAN', 'ADMIN', 'STAFF', 'CUSTOMER', 'GUEST', 'SUPER_ADMIN']).optional()
});

export type RegisterDto = z.infer<typeof registerSchema>;

// Google OAuth
export const googleAuthSchema = z.object({
  idToken: z.string().min(1, 'ID token is required')
});

export type GoogleAuthDto = z.infer<typeof googleAuthSchema>;

// Refresh Token
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;

import { Request } from 'express';
import { UserRole } from '@prisma/client';

// Authenticated Request (extends Express Request)
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    clinicId?: string;
  };
}
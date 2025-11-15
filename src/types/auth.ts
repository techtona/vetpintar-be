import { Request } from 'express';
import { User, UserRole, Clinic, ClinicAccessRole } from '../generated/prisma/index';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    clinicId?: string;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role?: UserRole;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ClinicWithAccess extends Clinic {
  accessRole: ClinicAccessRole;
  grantedAt: Date;
}

export interface UserWithClinics extends User {
  clinicAccesses: Array<{
    id: string;
    accessRole: ClinicAccessRole;
    clinic: Clinic;
  }>;
}
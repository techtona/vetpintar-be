import { Clinic, SubscriptionStatus, ClinicAccessRole } from '../generated/prisma/index';

export interface CreateClinicRequest {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  logoUrl?: string;
}

export interface UpdateClinicRequest extends Partial<CreateClinicRequest> {
  subscriptionStatus?: SubscriptionStatus;
  isActive?: boolean;
}

export interface ClinicWithStats extends Clinic {
  _count: {
    patients: number;
    invoices: number;
    users: number;
  };
}

export interface ClinicAccessRequest {
  userId: string;
  clinicId: string;
  accessRole: ClinicAccessRole;
}

export interface ClinicUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  accessRole: ClinicAccessRole;
  grantedAt: Date;
  isActive: boolean;
}
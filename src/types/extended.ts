// Extended Prisma Types

import { User, Clinic, ClinicAccessRole, Patient, MedicalRecord } from '@prisma/client';

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

export interface PatientWithOwner extends Patient {
  owner: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  _count: {
    medicalRecords: number;
    invoices: number;
  };
}

export interface PatientWithRecords extends Patient {
  owner: {
    id: string;
    name: string;
    email: string;
  };
  medicalRecords: MedicalRecord[];
}

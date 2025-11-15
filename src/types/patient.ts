import { Patient, MedicalRecord } from '../generated/prisma/index';

export interface CreatePatientRequest {
  name: string;
  species: string;
  breed?: string;
  gender?: string;
  birthDate?: Date;
  color?: string;
  microchipId?: string;
  ownerId: string;
}

export interface UpdatePatientRequest extends Partial<CreatePatientRequest> {
  isActive?: boolean;
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

export interface PatientFilter {
  species?: string;
  breed?: string;
  gender?: string;
  ownerId?: string;
  search?: string;
  isActive?: boolean;
}
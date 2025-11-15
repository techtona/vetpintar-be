import { PrismaClient, Patient } from "@prisma/client";
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { prisma } from '../utils/database';

interface CreatePatientData {
  name: string;
  species: string;
  breed?: string;
  gender?: string;
  birthDate?: Date;
  color?: string;
  microchipId?: string;
  photoUrl?: string;
  ownerId: string;
  clinicId: string;
}

interface UpdatePatientData {
  name?: string;
  species?: string;
  breed?: string;
  gender?: string;
  birthDate?: Date;
  color?: string;
  microchipId?: string;
  photoUrl?: string;
  isActive?: boolean;
}

interface GetPatientsQuery {
  page?: number;
  limit?: number;
  clinicId?: string;
  ownerId?: string;
  search?: string;
  species?: string;
  isActive?: boolean;
}

export class PatientService {
  private readonly prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async createPatient(data: CreatePatientData): Promise<Patient> {
    try {
      // Validate owner exists and has access to clinic
      const owner = await this.prisma.user.findFirst({
        where: {
          id: data.ownerId,
          clinicAccesses: {
            some: {
              clinicId: data.clinicId
            }
          }
        }
      });

      if (!owner) {
        throw createError(404, 'Owner not found or does not have access to this clinic');
      }

      // Check for duplicate microchip ID
      if (data.microchipId) {
        const existingPatient = await this.prisma.patient.findFirst({
          where: {
            microchipId: data.microchipId,
            clinicId: data.clinicId
          }
        });

        if (existingPatient) {
          throw createError(409, 'Patient with this microchip ID already exists');
        }
      }

      const patient = await this.prisma.patient.create({
        data: {
          ...data,
          birthDate: data.birthDate || null
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          clinic: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      logger.info(`Patient created: ${patient.id} for clinic: ${patient.clinicId}`);
      return patient;
    } catch (error) {
      logger.error('Error creating patient:', error);
      throw error;
    }
  }

  async getPatients(query: GetPatientsQuery): Promise<{
    patients: Patient[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        page = 1,
        limit = 20,
        clinicId,
        ownerId,
        search,
        species,
        isActive = true
      } = query;

      const skip = (page - 1) * limit;
      const where: any = { isActive };

      if (clinicId) {
        where.clinicId = clinicId;
      }

      if (ownerId) {
        where.ownerId = ownerId;
      }

      if (species) {
        where.species = species;
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { breed: { contains: search, mode: 'insensitive' } },
          { microchipId: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [patients, total] = await Promise.all([
        this.prisma.patient.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true
              }
            },
            clinic: {
              select: {
                id: true,
                name: true
              }
            },
            _count: {
              select: {
                medicalRecords: true,
                invoices: true
              }
            }
          }
        }),
        this.prisma.patient.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        patients,
        total,
        page,
        totalPages
      };
    } catch (error) {
      logger.error('Error fetching patients:', error);
      throw error;
    }
  }

  async getPatientById(id: string, clinicId?: string): Promise<Patient> {
    try {
      const where: any = { id };

      if (clinicId) {
        where.clinicId = clinicId;
      }

      const patient = await this.prisma.patient.findFirst({
        where,
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          clinic: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              address: true
            }
          },
          medicalRecords: {
            orderBy: { visitDate: 'desc' },
            take: 10,
            include: {
              veterinarian: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          invoices: {
            orderBy: { issueDate: 'desc' },
            take: 10
          }
        }
      });

      if (!patient) {
        throw createError(404, 'Patient not found');
      }

      return patient;
    } catch (error) {
      logger.error('Error fetching patient:', error);
      throw error;
    }
  }

  async updatePatient(id: string, data: UpdatePatientData, clinicId?: string): Promise<Patient> {
    try {
      const where: any = { id };

      if (clinicId) {
        where.clinicId = clinicId;
      }

      // Check if patient exists
      const existingPatient = await this.prisma.patient.findFirst({
        where
      });

      if (!existingPatient) {
        throw createError(404, 'Patient not found');
      }

      // Check for duplicate microchip ID (if updating)
      if (data.microchipId && data.microchipId !== existingPatient.microchipId) {
        const duplicatePatient = await this.prisma.patient.findFirst({
          where: {
            microchipId: data.microchipId,
            clinicId: existingPatient.clinicId,
            id: { not: id }
          }
        });

        if (duplicatePatient) {
          throw createError(409, 'Patient with this microchip ID already exists');
        }
      }

      const patient = await this.prisma.patient.update({
        where: { id },
        data: {
          ...data,
          birthDate: data.birthDate || undefined,
          updatedAt: new Date()
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          clinic: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      logger.info(`Patient updated: ${patient.id}`);
      return patient;
    } catch (error) {
      logger.error('Error updating patient:', error);
      throw error;
    }
  }

  async deletePatient(id: string, clinicId?: string): Promise<void> {
    try {
      const where: any = { id };

      if (clinicId) {
        where.clinicId = clinicId;
      }

      const patient = await this.prisma.patient.findFirst({
        where,
        include: {
          _count: {
            select: {
              medicalRecords: true,
              invoices: true
            }
          }
        }
      });

      if (!patient) {
        throw createError(404, 'Patient not found');
      }

      // Check if patient has associated records
      if (patient._count.medicalRecords > 0 || patient._count.invoices > 0) {
        // Soft delete instead of hard delete
        await this.prisma.patient.update({
          where: { id },
          data: {
            isActive: false,
            updatedAt: new Date()
          }
        });

        logger.info(`Patient soft deleted: ${id}`);
      } else {
        // Hard delete if no associated records
        await this.prisma.patient.delete({
          where: { id }
        });

        logger.info(`Patient hard deleted: ${id}`);
      }
    } catch (error) {
      logger.error('Error deleting patient:', error);
      throw error;
    }
  }

  async getPatientStats(clinicId: string): Promise<{
    totalPatients: number;
    activePatients: number;
    newPatientsThisMonth: number;
    speciesDistribution: Record<string, number>;
  }> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        totalPatients,
        activePatients,
        newPatientsThisMonth,
        speciesByCount
      ] = await Promise.all([
        this.prisma.patient.count({
          where: { clinicId }
        }),
        this.prisma.patient.count({
          where: { clinicId, isActive: true }
        }),
        this.prisma.patient.count({
          where: {
            clinicId,
            createdAt: { gte: startOfMonth }
          }
        }),
        this.prisma.patient.groupBy({
          by: ['species'],
          where: { clinicId, isActive: true },
          _count: { species: true }
        })
      ]);

      const speciesDistribution = speciesByCount.reduce((acc, item) => {
        acc[item.species] = item._count.species;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalPatients,
        activePatients,
        newPatientsThisMonth,
        speciesDistribution
      };
    } catch (error) {
      logger.error('Error fetching patient stats:', error);
      throw error;
    }
  }
}

export const patientService = new PatientService();
import { PrismaClient, MedicalRecord, RecordStatus } from "@prisma/client";
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { prisma } from '../utils/database';
import { io } from '../index';

interface CreateMedicalRecordData {
  patientId: string;
  veterinarianId: string;
  clinicId: string;
  visitDate: Date;
  chiefComplaint: string;
  diagnosis?: string;
  treatment?: string;
  prescription?: string;
  notes?: string;
  weight?: number;
  temperature?: number;
  status?: RecordStatus;
  totalAmount?: number;
}

interface UpdateMedicalRecordData {
  visitDate?: Date;
  chiefComplaint?: string;
  diagnosis?: string;
  treatment?: string;
  prescription?: string;
  notes?: string;
  weight?: number;
  temperature?: number;
  status?: RecordStatus;
  totalAmount?: number;
}

interface CreateHospitalizationData {
  medicalRecordId: string;
  admissionDate: Date;
  cageNumber?: string;
  dailyNotes?: string;
}

interface UpdateHospitalizationData {
  dischargeDate?: Date;
  cageNumber?: string;
  dailyNotes?: string;
  status?: string;
}

interface GetMedicalRecordsQuery {
  page?: number;
  limit?: number;
  clinicId?: string;
  patientId?: string;
  veterinarianId?: string;
  status?: RecordStatus;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export class MedicalRecordService {
  private readonly prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async createMedicalRecord(data: CreateMedicalRecordData): Promise<MedicalRecord> {
    try {
      // Verify patient and clinic access
      const patient = await this.prisma.patient.findFirst({
        where: {
          id: data.patientId,
          clinicId: data.clinicId
        },
        include: { owner: true }
      });

      if (!patient) {
        throw createError(404, 'Patient not found or access denied');
      }

      // Verify veterinarian has access to clinic
      const veterinarian = await this.prisma.user.findFirst({
        where: {
          id: data.veterinarianId,
          clinicAccesses: {
            some: { clinicId: data.clinicId }
          }
        }
      });

      if (!veterinarian) {
        throw createError(404, 'Veterinarian not found or access denied');
      }

      const medicalRecord = await this.prisma.medicalRecord.create({
        data: {
          ...data,
          status: data.status || RecordStatus.OUTPATIENT
        },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              species: true,
              breed: true
            }
          },
          veterinarian: {
            select: {
              id: true,
              name: true
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

      // Emit real-time notification
      io.to(`clinic-${data.clinicId}`).emit('medical-record-created', {
        recordId: medicalRecord.id,
        patientName: patient.name,
        veterinarianName: veterinarian.name,
        visitDate: medicalRecord.visitDate,
        status: medicalRecord.status
      });

      logger.info(`Medical record created: ${medicalRecord.id} for patient: ${data.patientId}`);
      return medicalRecord;
    } catch (error) {
      logger.error('Error creating medical record:', error);
      throw error;
    }
  }

  async getMedicalRecords(query: GetMedicalRecordsQuery): Promise<{
    medicalRecords: MedicalRecord[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        page = 1,
        limit = 20,
        clinicId,
        patientId,
        veterinarianId,
        status,
        dateFrom,
        dateTo,
        search
      } = query;

      const skip = (page - 1) * limit;
      const where: any = {};

      if (clinicId) {
        where.clinicId = clinicId;
      }

      if (patientId) {
        where.patientId = patientId;
      }

      if (veterinarianId) {
        where.veterinarianId = veterinarianId;
      }

      if (status) {
        where.status = status;
      }

      if (dateFrom || dateTo) {
        where.visitDate = {};
        if (dateFrom) where.visitDate.gte = dateFrom;
        if (dateTo) where.visitDate.lte = dateTo;
      }

      if (search) {
        where.OR = [
          { chiefComplaint: { contains: search, mode: 'insensitive' } },
          { diagnosis: { contains: search, mode: 'insensitive' } },
          { treatment: { contains: search, mode: 'insensitive' } },
          { patient: { name: { contains: search, mode: 'insensitive' } } }
        ];
      }

      const [medicalRecords, total] = await Promise.all([
        this.prisma.medicalRecord.findMany({
          where,
          skip,
          take: limit,
          orderBy: { visitDate: 'desc' },
          include: {
            patient: {
              select: {
                id: true,
                name: true,
                species: true,
                breed: true
              }
            },
            veterinarian: {
              select: {
                id: true,
                name: true
              }
            },
            hospitalizations: true,
            _count: {
              select: {
                hospitalizations: true
              }
            }
          }
        }),
        this.prisma.medicalRecord.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        medicalRecords,
        total,
        page,
        totalPages
      };
    } catch (error) {
      logger.error('Error fetching medical records:', error);
      throw error;
    }
  }

  async getMedicalRecordById(id: string, clinicId?: string): Promise<MedicalRecord> {
    try {
      const where: any = { id };

      if (clinicId) {
        where.clinicId = clinicId;
      }

      const medicalRecord = await this.prisma.medicalRecord.findFirst({
        where,
        include: {
          patient: {
            include: {
              owner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true
                }
              }
            }
          },
          veterinarian: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          clinic: {
            select: {
              id: true,
              name: true
            }
          },
          hospitalizations: {
            orderBy: { admissionDate: 'desc' }
          }
        }
      });

      if (!medicalRecord) {
        throw createError(404, 'Medical record not found');
      }

      return medicalRecord;
    } catch (error) {
      logger.error('Error fetching medical record:', error);
      throw error;
    }
  }

  async updateMedicalRecord(id: string, data: UpdateMedicalRecordData, clinicId?: string): Promise<MedicalRecord> {
    try {
      const where: any = { id };

      if (clinicId) {
        where.clinicId = clinicId;
      }

      const existingRecord = await this.prisma.medicalRecord.findFirst({
        where
      });

      if (!existingRecord) {
        throw createError(404, 'Medical record not found');
      }

      const updatedRecord = await this.prisma.medicalRecord.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date()
        },
        include: {
          patient: {
            select: {
              id: true,
              name: true
            }
          },
          veterinarian: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      // Emit real-time notification
      if (clinicId) {
        io.to(`clinic-${clinicId}`).emit('medical-record-updated', {
          recordId: updatedRecord.id,
          patientName: updatedRecord.patient.name,
          status: updatedRecord.status
        });
      }

      logger.info(`Medical record updated: ${updatedRecord.id}`);
      return updatedRecord;
    } catch (error) {
      logger.error('Error updating medical record:', error);
      throw error;
    }
  }

  async createHospitalization(data: CreateHospitalizationData): Promise<any> {
    try {
      // Verify medical record exists
      const medicalRecord = await this.prisma.medicalRecord.findUnique({
        where: { id: data.medicalRecordId },
        include: { patient: true }
      });

      if (!medicalRecord) {
        throw createError(404, 'Medical record not found');
      }

      // Check if patient is already hospitalized
      const existingHospitalization = await this.prisma.hospitalization.findFirst({
        where: {
          medicalRecordId: data.medicalRecordId,
          status: 'ADMITTED'
        }
      });

      if (existingHospitalization) {
        throw createError(400, 'Patient is already hospitalized');
      }

      const hospitalization = await this.prisma.hospitalization.create({
        data: {
          medicalRecordId: data.medicalRecordId,
          admissionDate: data.admissionDate,
          cageNumber: data.cageNumber || null,
          dailyNotes: data.dailyNotes || null,
          status: 'ADMITTED'
        },
        include: {
          medicalRecord: {
            include: {
              patient: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      // Update medical record status to INPATIENT
      await this.prisma.medicalRecord.update({
        where: { id: data.medicalRecordId },
        data: { status: RecordStatus.INPATIENT }
      });

      // Emit real-time notification
      io.to(`clinic-${medicalRecord.clinicId}`).emit('patient-admitted', {
        hospitalizationId: hospitalization.id,
        patientName: medicalRecord.patient.name,
        admissionDate: hospitalization.admissionDate,
        cageNumber: hospitalization.cageNumber
      });

      logger.info(`Hospitalization created: ${hospitalization.id} for medical record: ${data.medicalRecordId}`);
      return hospitalization;
    } catch (error) {
      logger.error('Error creating hospitalizations:', error);
      throw error;
    }
  }

  async updateHospitalization(id: string, data: UpdateHospitalizationData): Promise<any> {
    try {
      const existingHospitalization = await this.prisma.hospitalization.findUnique({
        where: { id },
        include: {
          medicalRecord: {
            include: { patient: true }
          }
        }
      });

      if (!existingHospitalization) {
        throw createError(404, 'Hospitalization record not found');
      }

      const updatedHospitalization = await this.prisma.hospitalization.update({
        where: { id },
        data: {
          ...data
        },
        include: {
          medicalRecord: {
            include: {
              patient: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      // If patient is being discharged, update medical record status
      if (data.dischargeDate && !existingHospitalization.dischargeDate) {
        await this.prisma.medicalRecord.update({
          where: { id: existingHospitalization.medicalRecordId },
          data: { status: RecordStatus.DISCHARGED }
        });

        // Emit real-time notification for discharge
        io.to(`clinic-${existingHospitalization.medicalRecord.clinicId}`).emit('patient-discharged', {
          hospitalizationId: id,
          patientName: existingHospitalization.medicalRecord.patient.name,
          dischargeDate: data.dischargeDate
        });
      }

      logger.info(`Hospitalization updated: ${id}`);
      return updatedHospitalization;
    } catch (error) {
      logger.error('Error updating hospitalizations:', error);
      throw error;
    }
  }

  async deleteMedicalRecord(id: string, clinicId?: string): Promise<void> {
    try {
      const where: any = { id };

      if (clinicId) {
        where.clinicId = clinicId;
      }

      const medicalRecord = await this.prisma.medicalRecord.findFirst({
        where,
        include: {
          _count: {
            select: {
              hospitalizations: true
            }
          }
        }
      });

      if (!medicalRecord) {
        throw createError(404, 'Medical record not found');
      }

      // Check if patient is currently hospitalized
      if (medicalRecord._count.hospitalizations > 0) {
        const activeHospitalization = await this.prisma.hospitalization.findFirst({
          where: {
            medicalRecordId: id,
            status: 'ADMITTED'
          }
        });

        if (activeHospitalization) {
          throw createError(400, 'Cannot delete medical record while patient is hospitalized');
        }
      }

      await this.prisma.medicalRecord.delete({
        where: { id }
      });

      logger.info(`Medical record deleted: ${id}`);
    } catch (error) {
      logger.error('Error deleting medical record:', error);
      throw error;
    }
  }

  async getMedicalRecordStats(clinicId: string, dateFrom?: Date, dateTo?: Date): Promise<{
    totalRecords: number;
    outpatients: number;
    inpatients: number;
    discharged: number;
    referred: number;
    averageVisitCost?: number;
    monthlyVisits?: number;
  }> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const dateFilter: any = {};
      if (dateFrom) dateFilter.gte = dateFrom;
      if (dateTo) dateFilter.lte = dateTo;

      const [
        totalRecords,
        outpatients,
        inpatients,
        discharged,
        referred,
        monthlyVisits,
        avgCostData
      ] = await Promise.all([
        this.prisma.medicalRecord.count({
          where: { clinicId, visitDate: dateFilter }
        }),
        this.prisma.medicalRecord.count({
          where: { clinicId, status: RecordStatus.OUTPATIENT, visitDate: dateFilter }
        }),
        this.prisma.medicalRecord.count({
          where: { clinicId, status: RecordStatus.INPATIENT, visitDate: dateFilter }
        }),
        this.prisma.medicalRecord.count({
          where: { clinicId, status: RecordStatus.DISCHARGED, visitDate: dateFilter }
        }),
        this.prisma.medicalRecord.count({
          where: { clinicId, status: RecordStatus.REFERRED, visitDate: dateFilter }
        }),
        this.prisma.medicalRecord.count({
          where: {
            clinicId,
            visitDate: { gte: startOfMonth }
          }
        }),
        this.prisma.medicalRecord.aggregate({
          where: { clinicId, visitDate: dateFilter },
          _avg: { totalAmount: true }
        })
      ]);

      return {
        totalRecords,
        outpatients,
        inpatients,
        discharged,
        referred,
        averageVisitCost: Number(avgCostData._avg.totalAmount) || 0,
        monthlyVisits
      };
    } catch (error) {
      logger.error('Error fetching medical record stats:', error);
      throw error;
    }
  }
}

export const medicalRecordService = new MedicalRecordService();
import { Response } from 'express';
import { AuthenticatedRequest, PaginationParams } from '../types';
import { prisma } from '../utils/database';
import { RecordStatus } from "@prisma/client";

interface CreateMedicalRecordRequest {
  patientId: string;
  veterinarianId: string;
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

interface UpdateMedicalRecordRequest extends Partial<CreateMedicalRecordRequest> {}

class MedicalRecordController {
  // GET /api/medical-records
  getAllMedicalRecords = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        patientId,
        veterinarianId,
        status,
        startDate,
        endDate
      } = req.query as PaginationParams & {
        search?: string;
        patientId?: string;
        veterinarianId?: string;
        status?: RecordStatus;
        startDate?: string;
        endDate?: string;
      };

      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {
        clinicId: req.user?.clinicId,
      };

      if (search) {
        where.OR = [
          { chiefComplaint: { contains: search, mode: 'insensitive' } },
          { diagnosis: { contains: search, mode: 'insensitive' } },
          { treatment: { contains: search, mode: 'insensitive' } },
          { patient: { name: { contains: search, mode: 'insensitive' } } },
        ];
      }

      if (patientId) where.patientId = patientId;
      if (veterinarianId) where.veterinarianId = veterinarianId;
      if (status) where.status = status;

      if (startDate || endDate) {
        where.visitDate = {};
        if (startDate) where.visitDate.gte = new Date(startDate as string);
        if (endDate) where.visitDate.lte = new Date(endDate as string);
      }

      const [medicalRecords, total] = await Promise.all([
        prisma.medicalRecord.findMany({
          where,
          include: {
            patient: {
              select: {
                id: true,
                name: true,
                species: true,
                breed: true,
                birthDate: true,
              },
            },
            veterinarian: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            hospitalizations: true,
          },
          orderBy: { visitDate: 'desc' },
          skip,
          take: Number(limit),
        }),
        prisma.medicalRecord.count({ where }),
      ]);

      res.json({
        success: true,
        data: medicalRecords,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch medical records',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // GET /api/medical-records/:id
  getMedicalRecordById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const medicalRecord = await prisma.medicalRecord.findFirst({
        where: {
          id,
          clinicId: req.user?.clinicId,
        },
        include: {
          patient: true,
          veterinarian: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          clinic: {
            select: {
              id: true,
              name: true,
              address: true,
              phone: true,
            },
          },
          hospitalizations: true,
        },
      });

      if (!medicalRecord) {
        res.status(404).json({
          success: false,
          message: 'Medical record not found',
        });
        return;
      }

      res.json({
        success: true,
        data: medicalRecord,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch medical record',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // POST /api/medical-records
  createMedicalRecord = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const recordData: CreateMedicalRecordRequest = req.body;

      // Verify patient exists and belongs to the clinic
      const patient = await prisma.patient.findFirst({
        where: {
          id: recordData.patientId,
          clinicId: req.user?.clinicId,
        },
      });

      if (!patient) {
        res.status(404).json({
          success: false,
          message: 'Patient not found or does not belong to this clinic',
        });
        return;
      }

      // Verify veterinarian exists and has access to the clinic
      const veterinarian = await prisma.user.findFirst({
        where: {
          id: recordData.veterinarianId,
          clinicAccesses: {
            some: {
              clinicId: req.user?.clinicId,
            },
          },
        },
      });

      if (!veterinarian) {
        res.status(404).json({
          success: false,
          message: 'Veterinarian not found or does not have access to this clinic',
        });
        return;
      }

      const medicalRecord = await prisma.medicalRecord.create({
        data: {
          ...recordData,
          clinicId: req.user!.clinicId!,
        },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              species: true,
              breed: true,
            },
          },
          veterinarian: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: 'Medical record created successfully',
        data: medicalRecord,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create medical record',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // PUT /api/medical-records/:id
  updateMedicalRecord = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData: UpdateMedicalRecordRequest = req.body;

      // Check if medical record exists and belongs to clinic
      const existingRecord = await prisma.medicalRecord.findFirst({
        where: {
          id,
          clinicId: req.user?.clinicId,
        },
      });

      if (!existingRecord) {
        res.status(404).json({
          success: false,
          message: 'Medical record not found',
        });
        return;
      }

      // If updating veterinarian, verify they have access to the clinic
      if (updateData.veterinarianId && updateData.veterinarianId !== existingRecord.veterinarianId) {
        const veterinarian = await prisma.user.findFirst({
          where: {
            id: updateData.veterinarianId,
            clinicAccesses: {
              some: {
                clinicId: req.user?.clinicId,
              },
            },
          },
        });

        if (!veterinarian) {
          res.status(404).json({
            success: false,
            message: 'Veterinarian not found or does not have access to this clinic',
          });
          return;
        }
      }

      const medicalRecord = await prisma.medicalRecord.update({
        where: { id },
        data: updateData,
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              species: true,
              breed: true,
            },
          },
          veterinarian: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      res.json({
        success: true,
        message: 'Medical record updated successfully',
        data: medicalRecord,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update medical record',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // DELETE /api/medical-records/:id
  deleteMedicalRecord = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const existingRecord = await prisma.medicalRecord.findFirst({
        where: {
          id,
          clinicId: req.user?.clinicId,
        },
      });

      if (!existingRecord) {
        res.status(404).json({
          success: false,
          message: 'Medical record not found',
        });
        return;
      }

      await prisma.medicalRecord.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Medical record deleted successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete medical record',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // GET /api/medical-records/patient/:patientId
  getPatientMedicalRecords = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { patientId } = req.params;
      const { page = 1, limit = 10 } = req.query as PaginationParams;

      const skip = (Number(page) - 1) * Number(limit);

      // Verify patient belongs to clinic
      const patient = await prisma.patient.findFirst({
        where: {
          id: patientId,
          clinicId: req.user?.clinicId,
        },
      });

      if (!patient) {
        res.status(404).json({
          success: false,
          message: 'Patient not found or does not belong to this clinic',
        });
        return;
      }

      const [medicalRecords, total] = await Promise.all([
        prisma.medicalRecord.findMany({
          where: {
            patientId,
            clinicId: req.user?.clinicId,
          },
          include: {
            veterinarian: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            hospitalizations: true,
          },
          orderBy: { visitDate: 'desc' },
          skip,
          take: Number(limit),
        }),
        prisma.medicalRecord.count({
          where: {
            patientId,
            clinicId: req.user?.clinicId,
          },
        }),
      ]);

      res.json({
        success: true,
        data: medicalRecords,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch patient medical records',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

export const medicalRecordController = new MedicalRecordController();
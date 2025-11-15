import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { prisma } from '../utils/database';

class PatientController {
  // GET /api/patients
  getAllPatients = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { page = 1, limit = 10, search, species, breed } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {
        clinicId: req.user?.clinicId,
        isActive: true,
      };

      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { species: { contains: search as string, mode: 'insensitive' } },
          { breed: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      if (species) where.species = species;
      if (breed) where.breed = breed;

      const [patients, total] = await Promise.all([
        prisma.patient.findMany({
          where,
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
            _count: {
              select: {
                medicalRecords: true,
                invoices: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit),
        }),
        prisma.patient.count({ where }),
      ]);

      res.json({
        success: true,
        data: patients,
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
        message: 'Failed to fetch patients',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // GET /api/patients/:id
  getPatientById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const patient = await prisma.patient.findFirst({
        where: {
          id,
          clinicId: req.user?.clinicId,
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          medicalRecords: {
            include: {
              veterinarian: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: { visitDate: 'desc' },
          },
        },
      });

      if (!patient) {
        res.status(404).json({
          success: false,
          message: 'Patient not found',
        });
        return;
      }

      res.json({
        success: true,
        data: patient,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch patient',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // POST /api/patients
  createPatient = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const patientData = req.body;

      const patient = await prisma.patient.create({
        data: {
          ...patientData,
          clinicId: req.user!.clinicId!,
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: 'Patient created successfully',
        data: patient,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create patient',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // PUT /api/patients/:id
  updatePatient = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const existingPatient = await prisma.patient.findFirst({
        where: {
          id,
          clinicId: req.user?.clinicId,
        },
      });

      if (!existingPatient) {
        res.status(404).json({
          success: false,
          message: 'Patient not found',
        });
        return;
      }

      const patient = await prisma.patient.update({
        where: { id },
        data: updateData,
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      res.json({
        success: true,
        message: 'Patient updated successfully',
        data: patient,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update patient',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // DELETE /api/patients/:id
  deletePatient = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const existingPatient = await prisma.patient.findFirst({
        where: {
          id,
          clinicId: req.user?.clinicId,
        },
      });

      if (!existingPatient) {
        res.status(404).json({
          success: false,
          message: 'Patient not found',
        });
        return;
      }

      await prisma.patient.update({
        where: { id },
        data: { isActive: false },
      });

      res.json({
        success: true,
        message: 'Patient deleted successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete patient',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

export const patientController = new PatientController();
import { PrismaClient, Clinic, SubscriptionStatus, ClinicAccessRole } from '../generated/prisma/index';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { prisma } from '../utils/database';

interface CreateClinicData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  logoUrl?: string;
  subscriptionStatus?: SubscriptionStatus;
}

interface UpdateClinicData {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  logoUrl?: string;
  subscriptionStatus?: SubscriptionStatus;
  isActive?: boolean;
}

interface GetClinicsQuery {
  page?: number;
  limit?: number;
  search?: string;
  city?: string;
  subscriptionStatus?: SubscriptionStatus;
  isActive?: boolean;
}

interface ClinicAccessData {
  userId: string;
  clinicId: string;
  accessRole: ClinicAccessRole;
}

export class ClinicService {
  private readonly prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async createClinic(data: CreateClinicData): Promise<Clinic> {
    try {
      const clinic = await this.prisma.clinic.create({
        data: {
          ...data,
          subscriptionStatus: data.subscriptionStatus || SubscriptionStatus.TRIAL
        }
      });

      logger.info(`Clinic created: ${clinic.id} - ${clinic.name}`);
      return clinic;
    } catch (error) {
      logger.error('Error creating clinic:', error);
      throw error;
    }
  }

  async getClinics(query: GetClinicsQuery): Promise<{
    clinics: Clinic[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        city,
        subscriptionStatus,
        isActive = true
      } = query;

      const skip = (page - 1) * limit;
      const where: any = { isActive };

      if (subscriptionStatus) {
        where.subscriptionStatus = subscriptionStatus;
      }

      if (city) {
        where.city = { contains: city, mode: 'insensitive' };
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [clinics, total] = await Promise.all([
        this.prisma.clinic.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: {
                patients: true,
                clinicAccesses: true,
                invoices: true,
                products: true
              }
            }
          }
        }),
        this.prisma.clinic.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        clinics,
        total,
        page,
        totalPages
      };
    } catch (error) {
      logger.error('Error fetching clinics:', error);
      throw error;
    }
  }

  async getClinicById(id: string): Promise<Clinic> {
    try {
      const clinic = await this.prisma.clinic.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              patients: true,
              clinicAccesses: true,
              invoices: true,
              products: true
            }
          }
        }
      });

      if (!clinic) {
        throw createError('Clinic not found', 404);
      }

      return clinic;
    } catch (error) {
      logger.error('Error fetching clinic:', error);
      throw error;
    }
  }

  async updateClinic(id: string, data: UpdateClinicData): Promise<Clinic> {
    try {
      const clinic = await this.prisma.clinic.findUnique({
        where: { id }
      });

      if (!clinic) {
        throw createError('Clinic not found', 404);
      }

      const updatedClinic = await this.prisma.clinic.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date()
        }
      });

      logger.info(`Clinic updated: ${updatedClinic.id}`);
      return updatedClinic;
    } catch (error) {
      logger.error('Error updating clinic:', error);
      throw error;
    }
  }

  async deleteClinic(id: string): Promise<void> {
    try {
      const clinic = await this.prisma.clinic.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              patients: true,
              clinicAccesses: true,
              invoices: true,
              products: true
            }
          }
        }
      });

      if (!clinic) {
        throw createError('Clinic not found', 404);
      }

      // Check if clinic has associated data
      const hasData =
        clinic._count.patients > 0 ||
        clinic._count.clinicAccesses > 0 ||
        clinic._count.invoices > 0 ||
        clinic._count.products > 0;

      if (hasData) {
        // Soft delete instead of hard delete
        await this.prisma.clinic.update({
          where: { id },
          data: {
            isActive: false,
            updatedAt: new Date()
          }
        });

        logger.info(`Clinic soft deleted: ${id}`);
      } else {
        // Hard delete if no associated data
        await this.prisma.clinic.delete({
          where: { id }
        });

        logger.info(`Clinic hard deleted: ${id}`);
      }
    } catch (error) {
      logger.error('Error deleting clinic:', error);
      throw error;
    }
  }

  async addUserToClinic(data: ClinicAccessData): Promise<void> {
    try {
      const { userId, clinicId, accessRole } = data;

      // Verify user exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw createError('User not found', 404);
      }

      // Verify clinic exists
      const clinic = await this.prisma.clinic.findUnique({
        where: { id: clinicId }
      });

      if (!clinic) {
        throw createError('Clinic not found', 404);
      }

      // Check if user already has access to this clinic
      const existingAccess = await this.prisma.clinicAccess.findFirst({
        where: { userId, clinicId }
      });

      if (existingAccess) {
        // Update existing access role
        await this.prisma.clinicAccess.update({
          where: { id: existingAccess.id },
          data: { accessRole }
        });
      } else {
        // Create new clinic access
        await this.prisma.clinicAccess.create({
          data: {
            userId,
            clinicId,
            accessRole
          }
        });
      }

      logger.info(`User ${userId} added to clinic ${clinicId} with role ${accessRole}`);
    } catch (error) {
      logger.error('Error adding user to clinic:', error);
      throw error;
    }
  }

  async removeUserFromClinic(userId: string, clinicId: string): Promise<void> {
    try {
      const clinicAccess = await this.prisma.clinicAccess.findFirst({
        where: { userId, clinicId }
      });

      if (!clinicAccess) {
        throw createError('User access not found for this clinic', 404);
      }

      await this.prisma.clinicAccess.delete({
        where: { id: clinicAccess.id }
      });

      logger.info(`User ${userId} removed from clinic ${clinicId}`);
    } catch (error) {
      logger.error('Error removing user from clinic:', error);
      throw error;
    }
  }

  async getClinicUsers(clinicId: string): Promise<any[]> {
    try {
      const clinicUsers = await this.prisma.clinicAccess.findMany({
        where: { clinicId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
              isActive: true,
              createdAt: true
            }
          }
        },
        orderBy: { grantedAt: 'desc' }
      });

      return clinicUsers.map(access => ({
        ...access.user,
        clinicAccessRole: access.accessRole,
        grantedAt: access.grantedAt
      }));
    } catch (error) {
      logger.error('Error fetching clinic users:', error);
      throw error;
    }
  }

  async getUserClinics(userId: string): Promise<any[]> {
    try {
      const userClinics = await this.prisma.clinicAccess.findMany({
        where: { userId },
        include: {
          clinic: {
            include: {
              _count: {
                select: {
                  patients: true,
                  invoices: true
                }
              }
            }
          }
        },
        orderBy: { grantedAt: 'desc' }
      });

      return userClinics.map(access => ({
        ...access.clinic,
        accessRole: access.accessRole,
        grantedAt: access.grantedAt
      }));
    } catch (error) {
      logger.error('Error fetching user clinics:', error);
      throw error;
    }
  }

  async getClinicStats(clinicId: string): Promise<{
    totalPatients: number;
    totalInvoices: number;
    totalProducts: number;
    totalUsers: number;
    monthlyRevenue?: number;
    activePatients?: number;
  }> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        totalPatients,
        totalInvoices,
        totalProducts,
        totalUsers,
        activePatients,
        monthlyRevenueData
      ] = await Promise.all([
        this.prisma.patient.count({
          where: { clinicId }
        }),
        this.prisma.invoice.count({
          where: { clinicId }
        }),
        this.prisma.product.count({
          where: { clinicId }
        }),
        this.prisma.clinicAccess.count({
          where: { clinicId }
        }),
        this.prisma.patient.count({
          where: { clinicId, isActive: true }
        }),
        this.prisma.invoice.aggregate({
          where: {
            clinicId,
            issueDate: { gte: startOfMonth },
            status: 'PAID'
          },
          _sum: { totalAmount: true }
        })
      ]);

      return {
        totalPatients,
        totalInvoices,
        totalProducts,
        totalUsers,
        activePatients,
        monthlyRevenue: Number(monthlyRevenueData._sum.totalAmount || 0)
      };
    } catch (error) {
      logger.error('Error fetching clinic stats:', error);
      throw error;
    }
  }
}

export const clinicService = new ClinicService();
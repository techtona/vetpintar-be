import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';

export class DashboardService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Get dashboard statistics (total counts)
   */
  async getStats(clinicId: string) {
    try {
      const [
        totalPatients,
        totalAppointments,
        pendingInvoices,
        totalRevenue,
      ] = await Promise.all([
        // Total patients
        this.prisma.patient.count({
          where: { clinicId, isActive: true },
        }),

        // Total appointments this month
        this.prisma.appointment.count({
          where: {
            clinicId,
            appointmentDate: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        }),

        // Pending invoices count
        this.prisma.invoice.count({
          where: {
            clinicId,
            status: 'SENT',
          },
        }),

        // Total revenue this month
        this.prisma.invoice.aggregate({
          where: {
            clinicId,
            status: 'PAID',
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
          _sum: {
            totalAmount: true,
          },
        }),
      ]);

      return {
        totalPatients,
        totalAppointments,
        pendingInvoices,
        totalRevenue: Number(totalRevenue._sum?.totalAmount || 0),
      };
    } catch (error) {
      logger.error('Error getting dashboard stats:', error);
      throw createError(500, 'Failed to fetch dashboard statistics');
    }
  }

  /**
   * Get appointments chart data
   */
  async getAppointmentsChart(clinicId: string, period: 'week' | 'month' | 'year' = 'month') {
    try {
      const now = new Date();
      let startDate: Date;
      let groupBy: 'day' | 'week' | 'month';

      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          groupBy = 'day';
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          groupBy = 'month';
          break;
        case 'month':
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          groupBy = 'day';
          break;
      }

      const appointments = await this.prisma.appointment.findMany({
        where: {
          clinicId,
          appointmentDate: {
            gte: startDate,
          },
        },
        select: {
          appointmentDate: true,
          status: true,
        },
      });

      // Group appointments by date
      const grouped = appointments.reduce((acc, apt) => {
        let key: string;
        const date = new Date(apt.appointmentDate);

        if (groupBy === 'day') {
          key = date.toISOString().split('T')[0];
        } else if (groupBy === 'month') {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        } else {
          // week
          const weekNum = Math.ceil(date.getDate() / 7);
          key = `Week ${weekNum}`;
        }

        if (!acc[key]) {
          acc[key] = { total: 0, completed: 0, cancelled: 0, pending: 0 };
        }

        acc[key].total++;
        if (apt.status === 'COMPLETED') acc[key].completed++;
        if (apt.status === 'CANCELLED') acc[key].cancelled++;
        if (apt.status === 'SCHEDULED') acc[key].pending++;

        return acc;
      }, {} as Record<string, { total: number; completed: number; cancelled: number; pending: number }>);

      return Object.entries(grouped).map(([date, data]) => ({
        date,
        ...data,
      }));
    } catch (error) {
      logger.error('Error getting appointments chart:', error);
      throw createError(500, 'Failed to fetch appointments chart data');
    }
  }

  /**
   * Get revenue chart data
   */
  async getRevenueChart(clinicId: string, period: 'week' | 'month' | 'year' = 'month') {
    try {
      const now = new Date();
      let startDate: Date;
      let groupBy: 'day' | 'week' | 'month';

      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          groupBy = 'day';
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          groupBy = 'month';
          break;
        case 'month':
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          groupBy = 'day';
          break;
      }

      const invoices = await this.prisma.invoice.findMany({
        where: {
          clinicId,
          status: 'PAID',
          createdAt: {
            gte: startDate,
          },
        },
        select: {
          createdAt: true,
          totalAmount: true,
        },
      });

      // Group revenue by date
      const grouped = invoices.reduce((acc, inv) => {
        let key: string;
        const date = new Date(inv.createdAt);

        if (groupBy === 'day') {
          key = date.toISOString().split('T')[0];
        } else if (groupBy === 'month') {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        } else {
          // week
          const weekNum = Math.ceil(date.getDate() / 7);
          key = `Week ${weekNum}`;
        }

        if (!acc[key]) {
          acc[key] = 0;
        }

        acc[key] += Number(inv.totalAmount);

        return acc;
      }, {} as Record<string, number>);

      return Object.entries(grouped).map(([date, revenue]) => ({
        date,
        revenue,
      }));
    } catch (error) {
      logger.error('Error getting revenue chart:', error);
      throw createError(500, 'Failed to fetch revenue chart data');
    }
  }

  /**
   * Get species distribution
   */
  async getSpeciesDistribution(clinicId: string) {
    try {
      const patients = await this.prisma.patient.groupBy({
        by: ['species'],
        where: {
          clinicId,
          isActive: true,
        },
        _count: {
          species: true,
        },
      });

      return patients.map((p) => ({
        species: p.species,
        count: p._count.species,
      }));
    } catch (error) {
      logger.error('Error getting species distribution:', error);
      throw createError(500, 'Failed to fetch species distribution');
    }
  }

  /**
   * Get recent activity
   */
  async getRecentActivity(clinicId: string, limit: number = 10) {
    try {
      // Get recent appointments, invoices, and medical records
      const [appointments, invoices, medicalRecords] = await Promise.all([
        this.prisma.appointment.findMany({
          where: { clinicId },
          include: {
            patient: {
              select: { name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        }),

        this.prisma.invoice.findMany({
          where: { clinicId },
          include: {
            patient: {
              select: { name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        }),

        this.prisma.medicalRecord.findMany({
          where: { clinicId },
          include: {
            patient: {
              select: { name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        }),
      ]);

      // Combine and format activities
      const activities = [
        ...appointments.map((a) => ({
          id: a.id,
          type: 'appointment',
          title: `Appointment for ${a.patient.name}`,
          description: `${a.reason}`,
          status: a.status,
          timestamp: a.createdAt,
        })),
        ...invoices.map((i) => ({
          id: i.id,
          type: 'invoice',
          title: `Invoice for ${i.patient.name}`,
          description: `Amount: ${Number(i.totalAmount)}`,
          status: i.status,
          timestamp: i.createdAt,
        })),
        ...medicalRecords.map((m) => ({
          id: m.id,
          type: 'medical_record',
          title: `Medical record for ${m.patient.name}`,
          description: m.diagnosis || 'Medical checkup',
          status: 'completed',
          timestamp: m.createdAt,
        })),
      ];

      // Sort by timestamp and limit
      return activities
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);
    } catch (error) {
      logger.error('Error getting recent activity:', error);
      throw createError(500, 'Failed to fetch recent activity');
    }
  }
}

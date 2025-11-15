import { Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboardService';
import { prisma } from '../utils/database';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../types';

const dashboardService = new DashboardService(prisma);

export class DashboardController {
  /**
   * Get dashboard statistics
   */
  static async getStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const clinicId = req.user?.clinicId;

      if (!clinicId) {
        // Return empty stats if no clinic assigned
        res.status(200).json({
          success: true,
          data: {
            totalPatients: 0,
            totalAppointments: 0,
            pendingInvoices: 0,
            totalRevenue: 0,
          },
        });
        return;
      }

      const stats = await dashboardService.getStats(clinicId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error in getStats:', error);
      next(error);
    }
  }

  /**
   * Get appointments chart data
   */
  static async getAppointmentsChart(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const clinicId = req.user?.clinicId;
      const period = (req.query.period as 'week' | 'month' | 'year') || 'month';

      if (!clinicId) {
        res.status(200).json({
          success: true,
          data: [],
        });
        return;
      }

      const data = await dashboardService.getAppointmentsChart(clinicId, period);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      logger.error('Error in getAppointmentsChart:', error);
      next(error);
    }
  }

  /**
   * Get revenue chart data
   */
  static async getRevenueChart(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const clinicId = req.user?.clinicId;
      const period = (req.query.period as 'week' | 'month' | 'year') || 'month';

      if (!clinicId) {
        res.status(200).json({
          success: true,
          data: [],
        });
        return;
      }

      const data = await dashboardService.getRevenueChart(clinicId, period);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      logger.error('Error in getRevenueChart:', error);
      next(error);
    }
  }

  /**
   * Get species distribution
   */
  static async getSpeciesDistribution(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const clinicId = req.user?.clinicId;

      if (!clinicId) {
        res.status(200).json({
          success: true,
          data: [],
        });
        return;
      }

      const data = await dashboardService.getSpeciesDistribution(clinicId);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      logger.error('Error in getSpeciesDistribution:', error);
      next(error);
    }
  }

  /**
   * Get recent activity
   */
  static async getRecentActivity(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const clinicId = req.user?.clinicId;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!clinicId) {
        res.status(200).json({
          success: true,
          data: [],
        });
        return;
      }

      const data = await dashboardService.getRecentActivity(clinicId, limit);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      logger.error('Error in getRecentActivity:', error);
      next(error);
    }
  }
}

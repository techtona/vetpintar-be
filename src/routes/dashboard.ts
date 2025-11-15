import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All dashboard routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 */
router.get('/stats', DashboardController.getStats);

/**
 * @swagger
 * /api/dashboard/appointments-chart:
 *   get:
 *     summary: Get appointments chart data
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, year]
 *         description: Time period for the chart
 *     responses:
 *       200:
 *         description: Appointments chart data
 */
router.get('/appointments-chart', DashboardController.getAppointmentsChart);

/**
 * @swagger
 * /api/dashboard/revenue-chart:
 *   get:
 *     summary: Get revenue chart data
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, year]
 *         description: Time period for the chart
 *     responses:
 *       200:
 *         description: Revenue chart data
 */
router.get('/revenue-chart', DashboardController.getRevenueChart);

/**
 * @swagger
 * /api/dashboard/species-distribution:
 *   get:
 *     summary: Get species distribution
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Species distribution data
 */
router.get('/species-distribution', DashboardController.getSpeciesDistribution);

/**
 * @swagger
 * /api/dashboard/recent-activity:
 *   get:
 *     summary: Get recent activity
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of activities to return
 *     responses:
 *       200:
 *         description: Recent activity data
 */
router.get('/recent-activity', DashboardController.getRecentActivity);

export const dashboardRoutes = router;

import { Response } from 'express';
import { AuthenticatedRequest, CreateClinicRequest, UpdateClinicRequest } from '../types';
import { prisma } from '../utils/database';

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateClinicRequest:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - phone
 *         - address
 *         - city
 *         - province
 *       properties:
 *         name:
 *           type: string
 *           description: Clinic name
 *           example: "Happy Pets Veterinary Clinic"
 *         email:
 *           type: string
 *           format: email
 *           description: Clinic email address
 *           example: "info@happypets.com"
 *         phone:
 *           type: string
 *           description: Clinic phone number
 *           example: "+1234567890"
 *         address:
 *           type: string
 *           description: Clinic address
 *           example: "123 Main St, City, State 12345"
 *         city:
 *           type: string
 *           description: Clinic city
 *           example: "New York"
 *         province:
 *           type: string
 *           description: Clinic province/state
 *           example: "NY"
 *         postalCode:
 *           type: string
 *           description: Clinic postal code
 *           example: "12345"
 *     UpdateClinicRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Clinic name
 *           example: "Happy Pets Veterinary Clinic"
 *         email:
 *           type: string
 *           format: email
 *           description: Clinic email address
 *           example: "info@happypets.com"
 *         phone:
 *           type: string
 *           description: Clinic phone number
 *           example: "+1234567890"
 *         address:
 *           type: string
 *           description: Clinic address
 *           example: "123 Main St, City, State 12345"
 *         city:
 *           type: string
 *           description: Clinic city
 *           example: "New York"
 *         province:
 *           type: string
 *           description: Clinic province/state
 *           example: "NY"
 *         postalCode:
 *           type: string
 *           description: Clinic postal code
 *           example: "12345"
 */

class ClinicController {
  /**
   * @swagger
   * /api/clinics:
   *   get:
   *     summary: Get all clinics with pagination and search
   *     tags: [Clinics]
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: Page number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 10
   *         description: Number of items per page
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Search term for name, city, or email
   *     responses:
   *       200:
   *         description: Clinics retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Clinic'
   *                 pagination:
   *                   type: object
   *                   properties:
   *                     page:
   *                       type: integer
   *                       example: 1
   *                     limit:
   *                       type: integer
   *                       example: 10
   *                     total:
   *                       type: integer
   *                       example: 50
   *                     totalPages:
   *                       type: integer
   *                       example: 5
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  // GET /api/clinics
  getAllClinics = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { page = 1, limit = 10, search } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {};

      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { city: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      const [clinics, total] = await Promise.all([
        prisma.clinic.findMany({
          where,
          include: {
            _count: {
              select: {
                patients: true,
                invoices: true,
                clinicAccesses: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit),
        }),
        prisma.clinic.count({ where }),
      ]);

      res.json({
        success: true,
        data: clinics,
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
        message: 'Failed to fetch clinics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * @swagger
   * /api/clinics/{id}:
   *   get:
   *     summary: Get clinic by ID
   *     tags: [Clinics]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Clinic ID
   *     responses:
   *       200:
   *         description: Clinic retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   allOf:
   *                     - $ref: '#/components/schemas/Clinic'
   *                     - type: object
   *                       properties:
   *                         clinicAccesses:
   *                           type: array
   *                           items:
   *                             type: object
   *                             properties:
   *                               user:
   *                                 $ref: '#/components/schemas/User'
   *                         _count:
   *                           type: object
   *                           properties:
   *                             patients:
   *                               type: integer
   *                             invoices:
   *                               type: integer
   *       404:
   *         description: Clinic not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  // GET /api/clinics/:id
  getClinicById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const clinic = await prisma.clinic.findUnique({
        where: { id },
        include: {
          clinicAccesses: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                  isActive: true,
                },
              },
            },
          },
          _count: {
            select: {
              patients: true,
              invoices: true,
            },
          },
        },
      });

      if (!clinic) {
        res.status(404).json({
          success: false,
          message: 'Clinic not found',
        });
        return;
      }

      res.json({
        success: true,
        data: clinic,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch clinic',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * @swagger
   * /api/clinics/my:
   *   get:
   *     summary: Get clinics accessible by current user
   *     tags: [Clinics]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User clinics retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: array
   *                   items:
   *                     allOf:
   *                       - $ref: '#/components/schemas/Clinic'
   *                       - type: object
   *                         properties:
   *                           _count:
   *                             type: object
   *                             properties:
   *                               patients:
   *                                 type: integer
   *                               invoices:
   *                                 type: integer
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  // GET /api/clinics/my
  getMyClinics = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const clinics = await prisma.clinic.findMany({
        where: {
          clinicAccesses: {
            some: {
              userId: req.user?.id,
            },
          },
        },
        include: {
          _count: {
            select: {
              patients: true,
              invoices: true,
            },
          },
        },
      });

      res.json({
        success: true,
        data: clinics,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user clinics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * @swagger
   * /api/clinics:
   *   post:
   *     summary: Create a new clinic
   *     tags: [Clinics]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateClinicRequest'
   *     responses:
   *       201:
   *         description: Clinic created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Clinic created successfully"
   *                 data:
   *                   $ref: '#/components/schemas/Clinic'
   *       400:
   *         description: Bad request - Invalid input data
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  // POST /api/clinics
  createClinic = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const clinicData: CreateClinicRequest = req.body;

      const clinic = await prisma.clinic.create({
        data: clinicData,
      });

      // Give the creator owner access
      await prisma.clinicAccess.create({
        data: {
          userId: req.user!.id!,
          clinicId: clinic.id,
          accessRole: 'OWNER',
        },
      });

      res.status(201).json({
        success: true,
        message: 'Clinic created successfully',
        data: clinic,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create clinic',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * @swagger
   * /api/clinics/{id}:
   *   put:
   *     summary: Update clinic by ID
   *     tags: [Clinics]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Clinic ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateClinicRequest'
   *     responses:
   *       200:
   *         description: Clinic updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Clinic updated successfully"
   *                 data:
   *                   $ref: '#/components/schemas/Clinic'
   *       400:
   *         description: Bad request - Invalid input data
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       404:
   *         description: Clinic not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  // PUT /api/clinics/:id
  updateClinic = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const updateData: UpdateClinicRequest = req.body;

      const clinic = await prisma.clinic.update({
        where: { id },
        data: updateData,
      });

      res.json({
        success: true,
        message: 'Clinic updated successfully',
        data: clinic,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update clinic',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * @swagger
   * /api/clinics/{id}:
   *   delete:
   *     summary: Soft delete clinic by ID (sets isActive to false)
   *     tags: [Clinics]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Clinic ID
   *     responses:
   *       200:
   *         description: Clinic deleted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Clinic deleted successfully"
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       404:
   *         description: Clinic not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  // DELETE /api/clinics/:id
  deleteClinic = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      await prisma.clinic.update({
        where: { id },
        data: { isActive: false },
      });

      res.json({
        success: true,
        message: 'Clinic deleted successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete clinic',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

export const clinicController = new ClinicController();
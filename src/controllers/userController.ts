import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { prisma } from '../utils/database';

class UserController {
  // GET /api/users
  getAllUsers = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { page = 1, limit = 10, search, role } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {};

      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      if (role) where.role = role;

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            clinicAccesses: {
              include: {
                clinic: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit),
        }),
        prisma.user.count({ where }),
      ]);

      res.json({
        success: true,
        data: users,
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
        message: 'Failed to fetch users',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // GET /api/users/:id
  getUserById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          clinicAccesses: {
            include: {
              clinic: true,
            },
          },
        },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // PUT /api/users/:id
  updateUser = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { name, phone, isActive } = req.body;

      const user = await prisma.user.update({
        where: { id },
        data: {
          name,
          phone,
          isActive,
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          isActive: true,
          updatedAt: true,
        },
      });

      res.json({
        success: true,
        message: 'User updated successfully',
        data: user,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update user',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // DELETE /api/users/:id
  deleteUser = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      await prisma.user.update({
        where: { id },
        data: { isActive: false },
      });

      res.json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete user',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // GET /api/users/clinic/:clinicId
  getClinicUsers = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { clinicId } = req.params;

      const users = await prisma.user.findMany({
        where: {
          clinicAccesses: {
            some: {
              clinicId,
            },
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          isActive: true,
          clinicAccesses: {
            where: {
              clinicId,
            },
            select: {
              accessRole: true,
              grantedAt: true,
            },
          },
        },
      });

      res.json({
        success: true,
        data: users,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch clinic users',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

export const userController = new UserController();
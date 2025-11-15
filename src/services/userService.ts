import { PrismaClient, User, UserRole, ClinicAccessRole } from '../generated/prisma/index';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { PasswordService } from '../utils/password';
import { prisma } from '../utils/database';

interface CreateUserData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: UserRole;
  clinicAccesses?: {
    clinicId: string;
    accessRole: ClinicAccessRole;
  }[];
}

interface UpdateUserData {
  name?: string;
  phone?: string;
  role?: UserRole;
  isActive?: boolean;
}

interface GetUsersQuery {
  page?: number;
  limit?: number;
  role?: UserRole;
  clinicId?: string;
  search?: string;
  isActive?: boolean;
}

export class UserService {
  private readonly prisma: PrismaClient;
  private readonly passwordService: PasswordService;

  constructor() {
    this.prisma = prisma;
    this.passwordService = new PasswordService();
  }

  async createUser(data: CreateUserData): Promise<User> {
    try {
      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: data.email }
      });

      if (existingUser) {
        throw createError(409, 'User with this email already exists');
      }

      // Hash password
      const passwordHash = await this.passwordService.hash(data.password);

      const user = await this.prisma.user.create({
        data: {
          email: data.email,
          passwordHash,
          name: data.name,
          phone: data.phone || null,
          role: data.role,
          clinicAccesses: data.clinicAccesses ? {
            create: data.clinicAccesses
          } : undefined
        },
        include: {
          clinicAccesses: {
            include: {
              clinic: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      // Remove password hash from response
      const { passwordHash: _, ...userWithoutPassword } = user;

      logger.info(`User created: ${user.id} with role: ${user.role}`);
      return userWithoutPassword as User;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  async getUsers(query: GetUsersQuery): Promise<{
    users: User[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        page = 1,
        limit = 20,
        role,
        clinicId,
        search,
        isActive = true
      } = query;

      const skip = (page - 1) * limit;
      const where: any = { isActive };

      if (role) {
        where.role = role;
      }

      if (clinicId) {
        where.clinicAccesses = {
          some: { clinicId }
        };
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            clinicAccesses: {
              include: {
                clinic: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            },
            _count: {
              select: {
                patients: true,
                medicalRecords: true,
                invoices: true
              }
            }
          }
        }),
        this.prisma.user.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      // Remove password hashes from response
      const usersWithoutPasswords = users.map(user => {
        const { passwordHash: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      return {
        users: usersWithoutPasswords as User[],
        total,
        page,
        totalPages
      };
    } catch (error) {
      logger.error('Error fetching users:', error);
      throw error;
    }
  }

  async getUserById(id: string): Promise<User> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        include: {
          clinicAccesses: {
            include: {
              clinic: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true
                }
              }
            }
          },
          _count: {
            select: {
              patients: true,
              medicalRecords: true,
              invoices: true
            }
          }
        }
      });

      if (!user) {
        throw createError(404, 'User not found');
      }

      // Remove password hash from response
      const { passwordHash: _, ...userWithoutPassword } = user;

      return userWithoutPassword as User;
    } catch (error) {
      logger.error('Error fetching user:', error);
      throw error;
    }
  }

  async updateUser(id: string, data: UpdateUserData): Promise<User> {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { id }
      });

      if (!existingUser) {
        throw createError(404, 'User not found');
      }

      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date()
        },
        include: {
          clinicAccesses: {
            include: {
              clinic: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      // Remove password hash from response
      const { passwordHash: _, ...userWithoutPassword } = updatedUser;

      logger.info(`User updated: ${updatedUser.id}`);
      return userWithoutPassword as User;
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  async updatePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id }
      });

      if (!user) {
        throw createError(404, 'User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await this.passwordService.compare(
        currentPassword,
        user.passwordHash
      );

      if (!isCurrentPasswordValid) {
        throw createError('Current password is incorrect', 400);
      }

      // Hash new password
      const newPasswordHash = await this.passwordService.hash(newPassword);

      await this.prisma.user.update({
        where: { id },
        data: {
          passwordHash: newPasswordHash,
          updatedAt: new Date()
        }
      });

      logger.info(`Password updated for user: ${id}`);
    } catch (error) {
      logger.error('Error updating password:', error);
      throw error;
    }
  }

  async resetPassword(id: string, newPassword: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id }
      });

      if (!user) {
        throw createError(404, 'User not found');
      }

      // Hash new password
      const newPasswordHash = await this.passwordService.hash(newPassword);

      await this.prisma.user.update({
        where: { id },
        data: {
          passwordHash: newPasswordHash,
          updatedAt: new Date()
        }
      });

      logger.info(`Password reset for user: ${id}`);
    } catch (error) {
      logger.error('Error resetting password:', error);
      throw error;
    }
  }

  async deactivateUser(id: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id }
      });

      if (!user) {
        throw createError(404, 'User not found');
      }

      // Prevent deactivation of the last super admin
      if (user.role === UserRole.SUPER_ADMIN) {
        const superAdminCount = await this.prisma.user.count({
          where: {
            role: UserRole.SUPER_ADMIN,
            isActive: true
          }
        });

        if (superAdminCount <= 1) {
          throw createError(400, 'Cannot deactivate the last super admin');
        }
      }

      await this.prisma.user.update({
        where: { id },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });

      logger.info(`User deactivated: ${id}`);
    } catch (error) {
      logger.error('Error deactivating user:', error);
      throw error;
    }
  }

  async activateUser(id: string): Promise<User> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          isActive: true,
          updatedAt: new Date()
        },
        include: {
          clinicAccesses: {
            include: {
              clinic: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      // Remove password hash from response
      const { passwordHash: _, ...userWithoutPassword } = user;

      logger.info(`User activated: ${id}`);
      return userWithoutPassword as User;
    } catch (error) {
      logger.error('Error activating user:', error);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              patients: true,
              medicalRecords: true,
              invoices: true,
              clinicAccesses: true
            }
          }
        }
      });

      if (!user) {
        throw createError(404, 'User not found');
      }

      // Prevent deletion of users with associated data
      const hasData =
        user._count.patients > 0 ||
        user._count.medicalRecords > 0 ||
        user._count.invoices > 0 ||
        user._count.clinicAccesses > 0;

      if (hasData) {
        // Soft delete instead of hard delete
        await this.prisma.user.update({
          where: { id },
          data: {
            isActive: false,
            updatedAt: new Date()
          }
        });

        logger.info(`User soft deleted: ${id}`);
      } else {
        // Hard delete if no associated data
        await this.prisma.user.delete({
          where: { id }
        });

        logger.info(`User hard deleted: ${id}`);
      }
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  async getUserStats(clinicId?: string): Promise<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    roleDistribution: Record<string, number>;
    newUsersThisMonth: number;
  }> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const baseWhere = clinicId ? {
        clinicAccesses: {
          some: { clinicId }
        }
      } : {};

      const [
        totalUsers,
        activeUsers,
        inactiveUsers,
        roleByCount,
        newUsersThisMonth
      ] = await Promise.all([
        this.prisma.user.count({ where: baseWhere }),
        this.prisma.user.count({
          where: { ...baseWhere, isActive: true }
        }),
        this.prisma.user.count({
          where: { ...baseWhere, isActive: false }
        }),
        this.prisma.user.groupBy({
          by: ['role'],
          where: { ...baseWhere, isActive: true },
          _count: { role: true }
        }),
        this.prisma.user.count({
          where: {
            ...baseWhere,
            createdAt: { gte: startOfMonth }
          }
        })
      ]);

      const roleDistribution = roleByCount.reduce((acc, item) => {
        acc[item.role] = item._count.role;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalUsers,
        activeUsers,
        inactiveUsers,
        roleDistribution,
        newUsersThisMonth
      };
    } catch (error) {
      logger.error('Error fetching user stats:', error);
      throw error;
    }
  }

  async searchUsers(query: string, clinicId?: string, limit: number = 10): Promise<User[]> {
    try {
      const where: any = {
        isActive: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query, mode: 'insensitive' } }
        ]
      };

      if (clinicId) {
        where.clinicAccesses = {
          some: { clinicId }
        };
      }

      const users = await this.prisma.user.findMany({
        where,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          clinicAccesses: {
            include: {
              clinic: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      // Remove password hashes from response
      const usersWithoutPasswords = users.map(user => {
        const { passwordHash: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      return usersWithoutPasswords as User[];
    } catch (error) {
      logger.error('Error searching users:', error);
      throw error;
    }
  }
}

export const userService = new UserService();
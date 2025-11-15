import { PrismaClient, User, Clinic, UserRole } from '../generated/prisma/index';
import { JWTService, TokenResponse } from '../utils/jwt';
import { PasswordService } from '../utils/password';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { prisma } from '../utils/database';
import { OAuth2Client } from 'google-auth-library';

interface LoginData {
  email: string;
  password: string;
  clinicId?: string;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: UserRole;
  clinicAccesses?: {
    clinicId: string;
    accessRole: string;
  }[];
}

interface GoogleLoginData {
  idToken: string;
}

export class AuthService {
  private jwtService: JWTService;
  private googleClient: OAuth2Client;

  constructor() {
    this.jwtService = new JWTService();
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  async login(email: string, password: string, clinicId?: string): Promise<TokenResponse> {
    // Find user with clinic accesses
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        clinicAccesses: {
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
          }
        }
      }
    });

    if (!user) {
      throw createError('Invalid email or password', 401);
    }

    if (!user.isActive) {
      throw createError('Account is deactivated', 401);
    }

    const isPasswordValid = await PasswordService.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw createError('Invalid email or password', 401);
    }

    // Check clinic access if clinicId is provided
    let clinics = user.clinicAccesses.map(ca => ca.clinic);
    let currentClinic: Clinic | undefined;

    if (clinicId) {
      const clinicAccess = user.clinicAccesses.find(ca => ca.clinicId === clinicId);

      if (!clinicAccess) {
        throw createError('No access to this clinic', 403);
      }

      currentClinic = clinicAccess.clinic;
    } else if (clinics.length > 0) {
      // Default to first clinic if none specified
      currentClinic = clinics[0];
      clinicId = currentClinic.id;
    }

    // Remove password hash from user object
    const userWithoutPassword = {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return this.jwtService.generateTokens(userWithoutPassword as any, clinicId, clinics);
  }

  async register(userData: RegisterData): Promise<TokenResponse> {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email }
    });

    if (existingUser) {
      throw createError('User with this email already exists', 409);
    }

    // Hash password
    const passwordHash = await PasswordService.hash(userData.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        passwordHash,
        name: userData.name,
        phone: userData.phone,
        role: userData.role,
        isActive: true
      },
      include: {
        clinicAccesses: {
          include: {
            clinic: true
          }
        }
      }
    });

    // Create clinic accesses if provided
    if (userData.clinicAccesses && userData.clinicAccesses.length > 0) {
      await prisma.clinicAccess.createMany({
        data: userData.clinicAccesses.map(access => ({
          userId: user.id,
          clinicId: access.clinicId,
          accessRole: access.accessRole as any
        }))
      });

      // Refetch user with clinic accesses
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          clinicAccesses: {
            include: {
              clinic: true
            }
          }
        }
      });

      if (updatedUser) {
        user.clinicAccesses = updatedUser.clinicAccesses;
      }
    }

    // Remove password hash from user object
    const userWithoutPassword = {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    const clinics = user.clinicAccesses.map(ca => ca.clinic);
    const currentClinic = clinics.length > 0 ? clinics[0] : undefined;

    logger.info(`New user registered: ${user.email}`, {
      userId: user.id,
      role: user.role
    });

    return this.jwtService.generateTokens(
      userWithoutPassword as any,
      currentClinic?.id,
      clinics
    );
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    try {
      const decoded = this.jwtService.verifyRefreshToken(refreshToken);

      // Find user with clinic accesses
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          clinicAccesses: {
            include: {
              clinic: true
            }
          }
        }
      });

      if (!user || !user.isActive) {
        throw createError('User not found or inactive', 401);
      }

      // Remove password hash from user object
      const userWithoutPassword = {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      const clinics = user.clinicAccesses.map(ca => ca.clinic);
      const currentClinic = clinics.length > 0 ? clinics[0] : undefined;

      return this.jwtService.generateTokens(
        userWithoutPassword as any,
        currentClinic?.id,
        clinics
      );
    } catch (error) {
      throw createError('Invalid refresh token', 401);
    }
  }

  async logout(token: string): Promise<void> {
    // In a real implementation, you might want to:
    // 1. Add the token to a blacklist
    // 2. Remove the token from Redis cache
    // 3. Log the logout event

    logger.info('User logged out', {
      token: token.substring(0, 10) + '...' // Log only part of the token for security
    });
  }

  async getCurrentUser(userId: string): Promise<Omit<User, 'passwordHash'>> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        clinicAccesses: {
          include: {
            clinic: true
          }
        }
      }
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    // Remove password hash
    const { passwordHash, ...userWithoutPassword } = user;

    return userWithoutPassword as Omit<User, 'passwordHash'>;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    const isCurrentPasswordValid = await PasswordService.compare(currentPassword, user.passwordHash);

    if (!isCurrentPasswordValid) {
      throw createError('Current password is incorrect', 401);
    }

    const newPasswordHash = await PasswordService.hash(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash }
    });

    logger.info('Password changed successfully', { userId });
  }

  async loginWithGoogle(idToken: string): Promise<TokenResponse> {
    try {
      // Check if GOOGLE_CLIENT_ID is configured
      if (!process.env.GOOGLE_CLIENT_ID) {
        logger.error('GOOGLE_CLIENT_ID environment variable is not set');
        throw createError('Google OAuth is not properly configured', 500);
      }

      // Verify Google ID token
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();

      if (!payload || !payload.email) {
        logger.error('Invalid Google token payload:', payload);
        throw createError('Invalid Google token', 401);
      }

      const { email, name, picture } = payload;

      // Check if user exists
      let user = await prisma.user.findUnique({
        where: { email },
        include: {
          clinicAccesses: {
            include: {
              clinic: true
            }
          }
        }
      });

      // If user doesn't exist, create new user
      if (!user) {
        // Generate a random password hash for Google users (they won't use it)
        const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
        const passwordHash = await PasswordService.hash(randomPassword);

        user = await prisma.user.create({
          data: {
            email,
            passwordHash,
            name: name || email.split('@')[0],
            role: UserRole.CUSTOMER, // Default role for Google sign-in
            isActive: true
          },
          include: {
            clinicAccesses: {
              include: {
                clinic: true
              }
            }
          }
        });

        logger.info(`New user created via Google OAuth: ${email}`, {
          userId: user.id
        });
      } else if (!user.isActive) {
        throw createError('Account is deactivated', 401);
      }

      // Remove password hash from user object
      const userWithoutPassword = {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      const clinics = user.clinicAccesses.map(ca => ca.clinic);
      const currentClinic = clinics.length > 0 ? clinics[0] : undefined;

      logger.info(`User logged in via Google OAuth: ${email}`, {
        userId: user.id
      });

      return this.jwtService.generateTokens(
        userWithoutPassword as any,
        currentClinic?.id,
        clinics
      );
    } catch (error: any) {
      if (error.statusCode) {
        throw error;
      }

      // Log detailed error information for debugging
      logger.error('Google OAuth verification failed:', {
        error: error.message,
        stack: error.stack,
        idTokenLength: idToken ? idToken.length : 0,
        hasClientId: !!process.env.GOOGLE_CLIENT_ID,
        clientIdPrefix: process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.substring(0, 10) + '...' : 'none'
      });

      // Provide more specific error messages
      if (error.message.includes('Wrong number of segments in id token')) {
        throw createError('Invalid ID token format', 401);
      } else if (error.message.includes('Invalid token signature')) {
        throw createError('Invalid token signature', 401);
      } else if (error.message.includes('Token used too early')) {
        throw createError('Token not yet valid', 401);
      } else if (error.message.includes('Token expired')) {
        throw createError('Token has expired', 401);
      } else if (error.message.includes('audience')) {
        throw createError('Token audience mismatch', 401);
      } else if (error.message.includes('issuer')) {
        throw createError('Token issuer mismatch', 401);
      }

      throw createError('Failed to authenticate with Google', 401);
    }
  }
}

export const authService = new AuthService();
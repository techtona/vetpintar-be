import { Request, Response, NextFunction } from 'express';
import { JWTService, JWTPayload } from '../utils/jwt';
import { prisma } from '../utils/database';
import { UserRole } from '../generated/prisma/index';
import { AuthenticatedRequest } from '../types';

export { AuthenticatedRequest } from '../types';

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token required'
      });
      return;
    }

    const jwtService = new JWTService();
    const decoded = jwtService.verifyAccessToken(token);

    // Verify user still exists and is active
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
      res.status(401).json({
        success: false,
        message: 'Invalid or inactive user'
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      clinicId: decoded.clinicId
    };

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

export const requireRole = (roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
      return;
    }

    next();
  };
};

export const requireClinicAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Super admins can access any clinic
    if (req.user.role === 'SUPER_ADMIN') {
      next();
      return;
    }

    const clinicId = req.params.clinicId || req.body.clinicId || req.user.clinicId;

    if (!clinicId) {
      res.status(400).json({
        success: false,
        message: 'Clinic ID required'
      });
      return;
    }

    const clinicAccess = await prisma.clinicAccess.findUnique({
      where: {
        userId_clinicId: {
          userId: req.user.id,
          clinicId: clinicId
        }
      }
    });

    if (!clinicAccess) {
      res.status(403).json({
        success: false,
        message: 'No access to this clinic'
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verifying clinic access'
    });
  }
};
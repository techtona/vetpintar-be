import jwt from 'jsonwebtoken';
import { User, Clinic } from "@prisma/client";

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  clinicId?: string | undefined;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  clinics?: Clinic[] | undefined;
  currentClinic?: Clinic | undefined;
}

export class JWTService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor() {
    this.accessTokenSecret = process.env.JWT_SECRET!;
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET!;
    this.accessTokenExpiry = process.env.JWT_EXPIRES_IN || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

    if (!this.accessTokenSecret || !this.refreshTokenSecret) {
      throw new Error('JWT secrets are not configured');
    }
  }

  generateTokens(user: User, clinicId?: string, clinics?: Clinic[]): TokenResponse {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      clinicId
    };

    const accessToken = jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiry,
      issuer: 'vetpintar-api',
      audience: 'vetpintar-client'
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email },
      this.refreshTokenSecret,
      {
        expiresIn: this.refreshTokenExpiry,
        issuer: 'vetpintar-api',
        audience: 'vetpintar-client'
      } as jwt.SignOptions
    );

    const currentClinic = clinics?.find(c => c.id === clinicId);

    return {
      accessToken,
      refreshToken,
      user,
      clinics,
      currentClinic
    };
  }

  verifyAccessToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        issuer: 'vetpintar-api',
        audience: 'vetpintar-client'
      }) as JWTPayload;

      return decoded;
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }

  verifyRefreshToken(token: string): { userId: string; email: string } {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        issuer: 'vetpintar-api',
        audience: 'vetpintar-client'
      }) as { userId: string; email: string };

      return decoded;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  decodeToken(token: string): any {
    return jwt.decode(token);
  }
}
import Joi from 'joi';
import { UserRole, ClinicAccessRole } from '../../generated/prisma/index';

const userRoles = Object.values(UserRole);
const clinicAccessRoles = Object.values(ClinicAccessRole);

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required'
  }),
  clinicId: Joi.string().uuid().optional()
});

export const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'any.required': 'Password is required'
  }),
  name: Joi.string().min(2).max(255).required().messages({
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name cannot exceed 255 characters',
    'any.required': 'Name is required'
  }),
  phone: Joi.string().optional(),
  role: Joi.string().valid(...userRoles).default('CUSTOMER'),
  clinicAccesses: Joi.array().items(
    Joi.object({
      clinicId: Joi.string().uuid().required(),
      accessRole: Joi.string().valid(...clinicAccessRoles).required()
    })
  ).optional()
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'Refresh token is required'
  })
});

export const googleLoginSchema = Joi.object({
  idToken: Joi.string().required().messages({
    'any.required': 'Google ID token is required'
  })
});
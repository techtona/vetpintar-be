import { UserRole, ProductCategory } from "@prisma/client";
import { PasswordService } from '../../src/utils/password';

// Test data utilities
export const createTestUser = async (testPrisma: any, overrides: any = {}) => {
  const defaultUser = {
    email: 'test@example.com',
    passwordHash: await PasswordService.hash('password123'),
    name: 'Test User',
    phone: '+62-812-3456-7890',
    role: UserRole.OWNER,
    isActive: true
  };

  return await testPrisma.user.create({
    data: { ...defaultUser, ...overrides }
  });
};

export const createTestClinic = async (testPrisma: any, overrides: any = {}) => {
  const defaultClinic = {
    name: 'Test Clinic',
    email: 'clinic@test.com',
    phone: '+62-21-1234-5678',
    address: '123 Test Street',
    city: 'Test City',
    province: 'Test Province',
    postalCode: '12345',
    subscriptionStatus: 'ACTIVE'
  };

  return await testPrisma.clinic.create({
    data: { ...defaultClinic, ...overrides }
  });
};

export const createClinicAccess = async (testPrisma: any, userId: string, clinicId: string, accessRole: any = 'OWNER') => {
  return await testPrisma.clinicAccess.create({
    data: {
      userId,
      clinicId,
      accessRole
    }
  });
};

export const createTestPatient = async (testPrisma: any, clinicId: string, ownerId: string, overrides: any = {}) => {
  const defaultPatient = {
    clinicId,
    ownerId,
    name: 'Test Patient',
    species: 'Dog',
    breed: 'Golden Retriever',
    gender: 'Male',
    birthDate: new Date('2020-01-01'),
    color: 'Golden'
  };

  return await testPrisma.patient.create({
    data: { ...defaultPatient, ...overrides }
  });
};

export const createTestProduct = async (testPrisma: any, clinicId: string, overrides: any = {}) => {
  const defaultProduct = {
    clinicId,
    name: 'Test Product',
    description: 'Test product description',
    category: ProductCategory.MEDICINE,
    unit: 'box',
    price: 50000,
    stockQuantity: 100,
    minStockAlert: 10,
    sku: 'TEST-001'
  };

  return await testPrisma.product.create({
    data: { ...defaultProduct, ...overrides }
  });
};

// Auth token helpers
export const generateTestToken = async (userId: string, clinicId?: string) => {
  const jwt = await import('jsonwebtoken');
  const payload = {
    userId,
    email: 'test@example.com',
    role: UserRole.OWNER,
    clinicId
  };

  return jwt.default.sign(payload, process.env.JWT_SECRET || 'test-secret', {
    expiresIn: '15m',
    issuer: 'vetpintar-api',
    audience: 'vetpintar-client'
  });
};

export const getAuthHeaders = async (token: string) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
});
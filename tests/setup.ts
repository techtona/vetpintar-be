import { PrismaClient } from "@prisma/client";

// Test database client
export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_TEST || process.env.DATABASE_URL
    }
  }
});

// Global test setup
beforeAll(async () => {
  // Clean up test database
  await cleanTestDatabase();
});

afterAll(async () => {
  // Close test database connection
  await testPrisma.$disconnect();
});

// Clean database helper
async function cleanTestDatabase() {
  // Delete data in reverse order of dependencies
  const tablenames = [
    'payments',
    'invoice_items',
    'invoices',
    'hospitalizations',
    'medical_records',
    'patients',
    'clinic_accesses',
    'products',
    'clinics',
    'users'
  ];

  for (const table of tablenames) {
    try {
      await testPrisma.$executeRawUnsafe(`DELETE FROM "${table}";`);
    } catch (error) {
      // Continue even if table doesn't exist
    }
  }
}

// Mock console methods for cleaner test output
global.console = {
  ...console,
  // Uncomment to suppress logs during tests
  // log: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};
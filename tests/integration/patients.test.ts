import request from 'supertest';
import express from 'express';
import { UserRole } from "@prisma/client";
import { testPrisma } from '../setup';
import { createTestUser, createTestClinic, createClinicAccess, createTestPatient, generateTestToken, getAuthHeaders } from '../helpers/testData';

describe('Patients API', () => {
  let app: express.Application;
  let testUser: any;
  let testClinic: any;
  let testPatient: any;
  let authToken: string;
  let authHeaders: any;

  beforeAll(async () => {
    // Setup express app
    app = express();
    app.use(express.json());

    // Import routes after app setup
    const { patientRoutes } = await import('../../src/routes/patients');
    app.use('/api/patients', patientRoutes);

    // Add error handler
    const { errorHandler } = await import('../../src/middleware/errorHandler');
    app.use(errorHandler);

    // Create test data
    testUser = await createTestUser(testPrisma);
    testClinic = await createTestClinic(testPrisma);
    await createClinicAccess(testPrisma, testUser.id, testClinic.id, 'VETERINARIAN');
    authToken = await generateTestToken(testUser.id, testClinic.id);
    authHeaders = await getAuthHeaders(authToken);
  });

  afterAll(async () => {
    // Cleanup
    await testPrisma.patient.deleteMany();
    await testPrisma.user.deleteMany();
    await testPrisma.clinic.deleteMany();
    await testPrisma.clinicAccess.deleteMany();
  });

  describe('GET /api/patients', () => {
    it('should get empty patient list', async () => {
      const response = await request(app)
        .get('/api/patients')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.pagination).toBeDefined();
    });

    it('should get patients with created test patient', async () => {
      // Create a test patient first
      testPatient = await createTestPatient(testPrisma, testClinic.id, testUser.id);

      const response = await request(app)
        .get('/api/patients')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe(testPatient.name);
      expect(response.body.data[0].species).toBe(testPatient.species);
    });

    it('should filter patients by search term', async () => {
      const response = await request(app)
        .get('/api/patients?search=' + testPatient.name.substring(0, 5))
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('should filter patients by species', async () => {
      const response = await request(app)
        .get('/api/patients?species=' + testPatient.species)
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('should paginate patients', async () => {
      // Create more patients for pagination test
      await createTestPatient(testPrisma, testClinic.id, testUser.id, { name: 'Patient 2', species: 'Cat' });
      await createTestPatient(testPrisma, testClinic.id, testUser.id, { name: 'Patient 3', species: 'Bird' });

      const response = await request(app)
        .get('/api/patients?page=1&limit=2')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.total).toBeGreaterThanOrEqual(3);
    });
  });

  describe('GET /api/patients/:id', () => {
    it('should get patient by ID', async () => {
      if (!testPatient) {
        testPatient = await createTestPatient(testPrisma, testClinic.id, testUser.id);
      }

      const response = await request(app)
        .get(`/api/patients/${testPatient.id}`)
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testPatient.id);
      expect(response.body.data.name).toBe(testPatient.name);
    });

    it('should return 404 for non-existent patient', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/patients/${fakeId}`)
        .set(authHeaders);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Patient not found');
    });

    it('should return 401 without authentication', async () => {
      if (!testPatient) {
        testPatient = await createTestPatient(testPrisma, testClinic.id, testUser.id);
      }

      const response = await request(app)
        .get(`/api/patients/${testPatient.id}`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/patients', () => {
    it('should create new patient successfully', async () => {
      const newPatient = {
        name: 'New Test Patient',
        species: 'Cat',
        breed: 'Persian',
        gender: 'Female',
        birthDate: '2021-05-15',
        color: 'White',
        ownerId: testUser.id,
        clinicId: testClinic.id
      };

      const response = await request(app)
        .post('/api/patients')
        .set(authHeaders)
        .send(newPatient);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Patient created successfully');
      expect(response.body.data.name).toBe(newPatient.name);
      expect(response.body.data.species).toBe(newPatient.species);

      // Cleanup
      await testPrisma.patient.delete({
        where: { id: response.body.data.id }
      });
    });

    it('should return error with invalid data', async () => {
      const invalidPatient = {
        name: '',
        species: '',
        ownerId: 'invalid-id'
      };

      const response = await request(app)
        .post('/api/patients')
        .set(authHeaders)
        .send(invalidPatient);

      expect(response.status).toBe(400);
    });

    it('should return 401 without authentication', async () => {
      const newPatient = {
        name: 'New Test Patient',
        species: 'Cat',
        ownerId: testUser.id
      };

      const response = await request(app)
        .post('/api/patients')
        .send(newPatient);

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/patients/:id', () => {
    it('should update patient successfully', async () => {
      if (!testPatient) {
        testPatient = await createTestPatient(testPrisma, testClinic.id, testUser.id);
      }

      const updateData = {
        name: 'Updated Patient Name',
        species: 'Updated Species'
      };

      const response = await request(app)
        .put(`/api/patients/${testPatient.id}`)
        .set(authHeaders)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Patient updated successfully');
      expect(response.body.data.name).toBe(updateData.name);
    });

    it('should return 404 for non-existent patient', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const updateData = { name: 'Updated' };

      const response = await request(app)
        .put(`/api/patients/${fakeId}`)
        .set(authHeaders)
        .send(updateData);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      if (!testPatient) {
        testPatient = await createTestPatient(testPrisma, testClinic.id, testUser.id);
      }

      const updateData = { name: 'Updated' };

      const response = await request(app)
        .put(`/api/patients/${testPatient.id}`)
        .send(updateData);

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/patients/:id', () => {
    it('should soft delete patient successfully', async () => {
      // Create a patient for deletion test
      const patientToDelete = await createTestPatient(testPrisma, testClinic.id, testUser.id, {
        name: 'Patient to Delete'
      });

      const response = await request(app)
        .delete(`/api/patients/${patientToDelete.id}`)
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Patient deleted successfully');

      // Verify patient is soft deleted
      const deletedPatient = await testPrisma.patient.findUnique({
        where: { id: patientToDelete.id }
      });

      expect(deletedPatient?.isActive).toBe(false);

      // Cleanup
      await testPrisma.patient.delete({
        where: { id: patientToDelete.id }
      });
    });

    it('should return 404 for non-existent patient', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .delete(`/api/patients/${fakeId}`)
        .set(authHeaders);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .delete(`/api/patients/${fakeId}`);

      expect(response.status).toBe(401);
    });
  });
});
import { PrismaClient } from '@prisma/client';
import { UserRole } from '../generated/prisma/index';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Clear existing data (in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('🧹 Cleaning existing data...');
      await prisma.invoiceItem.deleteMany();
      await prisma.invoice.deleteMany();
      await prisma.payment.deleteMany();
      await prisma.appointment.deleteMany();
      await prisma.medicalRecord.deleteMany();
      await prisma.patient.deleteMany();
      await prisma.product.deleteMany();
      await prisma.clinicAccess.deleteMany();
      await prisma.user.deleteMany();
      await prisma.clinic.deleteMany();
    }

    // Create Clinics
    console.log('🏥 Creating clinics...');
    const clinics = await Promise.all([
      prisma.clinic.create({
        data: {
          name: 'Happy Paws Veterinary Clinic',
          email: 'contact@happypaws.com',
          phone: '+1-555-0123',
          address: '123 Main Street',
          city: 'Jakarta',
          province: 'DKI Jakarta',
          postalCode: '12345',
          subscriptionStatus: 'ACTIVE',
        },
      }),
      prisma.clinic.create({
        data: {
          name: 'Care & Cure Pet Hospital',
          email: 'info@carecure.com',
          phone: '+1-555-0456',
          address: '456 Oak Avenue',
          city: 'Bandung',
          province: 'West Java',
          postalCode: '40123',
          subscriptionStatus: 'ACTIVE',
        },
      }),
    ]);

    // Create Users
    console.log('👥 Creating users...');
    const hashedPassword = await bcrypt.hash('password123', 10);

    const users = await Promise.all([
      // Super Admin
      prisma.user.create({
        data: {
          email: 'admin@vetpintar.com',
          name: 'Super Admin',
          phone: '+1-555-0100',
          role: UserRole.SUPER_ADMIN,
          isActive: true,
        },
      }),

      // Clinic 1 Users
      prisma.user.create({
        data: {
          email: 'dr.sarah@happypaws.com',
          name: 'Dr. Sarah Johnson',
          phone: '+1-555-0101',
          role: UserRole.VETERINARIAN,
          isActive: true,
        },
      }),
      prisma.user.create({
        data: {
          email: 'john.owner@happypaws.com',
          name: 'John Smith',
          phone: '+1-555-0102',
          role: UserRole.OWNER,
          isActive: true,
        },
      }),
      prisma.user.create({
        data: {
          email: 'mary.staff@happypaws.com',
          name: 'Mary Wilson',
          phone: '+1-555-0103',
          role: UserRole.STAFF,
          isActive: true,
        },
      }),

      // Clinic 2 Users
      prisma.user.create({
        data: {
          email: 'dr.mike@carecure.com',
          name: 'Dr. Michael Chen',
          phone: '+1-555-0201',
          role: UserRole.VETERINARIAN,
          isActive: true,
        },
      }),
      prisma.user.create({
        data: {
          email: 'lisa.owner@carecure.com',
          name: 'Lisa Anderson',
          phone: '+1-555-0202',
          role: UserRole.OWNER,
          isActive: true,
        },
      }),
    ]);

    // Create Clinic Access
    console.log('🔑 Creating clinic access...');
    await Promise.all([
      // Clinic 1 Access
      prisma.clinicAccess.create({
        data: {
          userId: users[1].id, // Dr. Sarah
          clinicId: clinics[0].id,
          accessRole: 'VETERINARIAN',
        },
      }),
      prisma.clinicAccess.create({
        data: {
          userId: users[2].id, // John Smith
          clinicId: clinics[0].id,
          accessRole: 'OWNER',
        },
      }),
      prisma.clinicAccess.create({
        data: {
          userId: users[3].id, // Mary Wilson
          clinicId: clinics[0].id,
          accessRole: 'STAFF',
        },
      }),

      // Clinic 2 Access
      prisma.clinicAccess.create({
        data: {
          userId: users[4].id, // Dr. Mike
          clinicId: clinics[1].id,
          accessRole: 'VETERINARIAN',
        },
      }),
      prisma.clinicAccess.create({
        data: {
          userId: users[5].id, // Lisa Anderson
          clinicId: clinics[1].id,
          accessRole: 'OWNER',
        },
      }),
    ]);

    // Create Patients
    console.log('🐕 Creating patients...');
    const patients = await Promise.all([
      // Clinic 1 Patients
      prisma.patient.create({
        data: {
          name: 'Max',
          species: 'dog',
          breed: 'Golden Retriever',
          gender: 'MALE',
          birthDate: '2022-03-15',
          color: 'Golden',
          microchipId: 'MC123456789',
          ownerId: users[2].id, // John Smith
          clinicId: clinics[0].id,
        },
      }),
      prisma.patient.create({
        data: {
          name: 'Luna',
          species: 'cat',
          breed: 'Persian',
          gender: 'FEMALE',
          birthDate: '2021-07-22',
          color: 'White',
          microchipId: 'MC987654321',
          ownerId: users[2].id, // John Smith
          clinicId: clinics[0].id,
        },
      }),
      prisma.patient.create({
        data: {
          name: 'Charlie',
          species: 'dog',
          breed: 'Beagle',
          gender: 'MALE',
          birthDate: '2020-11-08',
          color: 'Tricolor',
          ownerId: users[2].id, // John Smith
          clinicId: clinics[0].id,
        },
      }),

      // Clinic 2 Patients
      prisma.patient.create({
        data: {
          name: 'Bella',
          species: 'cat',
          breed: 'Siamese',
          gender: 'FEMALE',
          birthDate: '2019-05-12',
          color: 'Cream',
          ownerId: users[5].id, // Lisa Anderson
          clinicId: clinics[1].id,
        },
      }),
      prisma.patient.create({
        data: {
          name: 'Rocky',
          species: 'dog',
          breed: 'German Shepherd',
          gender: 'MALE',
          birthDate: '2018-09-30',
          color: 'Black and Tan',
          ownerId: users[5].id, // Lisa Anderson
          clinicId: clinics[1].id,
        },
      }),
    ]);

    // Create Products
    console.log('💊 Creating products...');
    await Promise.all([
      // Clinic 1 Products
      prisma.product.create({
        data: {
          name: 'Amoxicillin 500mg',
          description: 'Antibiotic for bacterial infections',
          category: 'MEDICINE',
          unit: 'capsules',
          price: 25.50,
          stockQuantity: 100,
          minStockAlert: 20,
          sku: 'MED001',
          clinicId: clinics[0].id,
        },
      }),
      prisma.product.create({
        data: {
          name: 'Science Diet Adult Dog Food',
          description: 'Premium dry dog food for adult dogs',
          category: 'FOOD',
          unit: 'kg',
          price: 45.00,
          stockQuantity: 25,
          minStockAlert: 5,
          sku: 'FD001',
          clinicId: clinics[0].id,
        },
      }),
      prisma.product.create({
        data: {
          name: 'Rabies Vaccine',
          description: 'Annual rabies vaccination',
          category: 'VACCINE',
          unit: 'dose',
          price: 35.00,
          stockQuantity: 50,
          minStockAlert: 10,
          sku: 'VAC001',
          clinicId: clinics[0].id,
        },
      }),

      // Clinic 2 Products
      prisma.product.create({
        data: {
          name: 'Ivermectin 1%',
          description: 'Antiparasitic treatment',
          category: 'MEDICINE',
          unit: 'ml',
          price: 15.75,
          stockQuantity: 75,
          minStockAlert: 15,
          sku: 'MED002',
          clinicId: clinics[1].id,
        },
      }),
    ]);

    // Create Appointments
    console.log('📅 Creating appointments...');
    const appointments = await Promise.all([
      prisma.appointment.create({
        data: {
          patientId: patients[0].id, // Max
          veterinarianId: users[1].id, // Dr. Sarah
          clinicId: clinics[0].id,
          appointmentDate: new Date('2024-01-15T10:00:00Z'),
          status: 'COMPLETED',
          chiefComplaint: 'Annual checkup and vaccination',
          notes: 'Patient is healthy, all vaccinations up to date',
        },
      }),
      prisma.appointment.create({
        data: {
          patientId: patients[1].id, // Luna
          veterinarianId: users[1].id, // Dr. Sarah
          clinicId: clinics[0].id,
          appointmentDate: new Date('2024-01-20T14:30:00Z'),
          status: 'SCHEDULED',
          chiefComplaint: 'Skin irritation and excessive scratching',
        },
      }),
      prisma.appointment.create({
        data: {
          patientId: patients[4].id, // Rocky
          veterinarianId: users[4].id, // Dr. Mike
          clinicId: clinics[1].id,
          appointmentDate: new Date('2024-01-18T09:00:00Z'),
          status: 'COMPLETED',
          chiefComplaint: 'Limping on left front leg',
          notes: 'Minor sprain, prescribed rest and anti-inflammatory',
        },
      }),
    ]);

    // Create Medical Records
    console.log('📋 Creating medical records...');
    await Promise.all([
      prisma.medicalRecord.create({
        data: {
          patientId: patients[0].id, // Max
          veterinarianId: users[1].id, // Dr. Sarah
          clinicId: clinics[0].id,
          visitDate: new Date('2024-01-15T10:00:00Z'),
          chiefComplaint: 'Annual checkup and vaccination',
          diagnosis: 'Healthy, no issues found',
          treatment: 'Rabies vaccine booster, annual wellness exam',
          prescription: 'No medication needed',
          weight: 32.5,
          temperature: 38.5,
          status: 'DISCHARGED',
        },
      }),
      prisma.medicalRecord.create({
        data: {
          patientId: patients[4].id, // Rocky
          veterinarianId: users[4].id, // Dr. Mike
          clinicId: clinics[1].id,
          visitDate: new Date('2024-01-18T09:00:00Z'),
          chiefComplaint: 'Limping on left front leg',
          diagnosis: 'Minor sprain in left shoulder',
          treatment: 'Rest for 5 days, anti-inflammatory medication',
          prescription: 'Carprofen 50mg - 1 tablet daily for 5 days',
          weight: 38.2,
          temperature: 38.2,
          status: 'DISCHARGED',
        },
      }),
    ]);

    // Create Invoices
    console.log('💰 Creating invoices...');
    const invoices = await Promise.all([
      prisma.invoice.create({
        data: {
          invoiceNumber: 'INV-2024-001',
          patientId: patients[0].id, // Max
          ownerId: users[2].id, // John Smith
          clinicId: clinics[0].id,
          issueDate: '2024-01-15',
          dueDate: '2024-01-29',
          subtotal: 95.00,
          taxAmount: 9.50,
          discountAmount: 5.00,
          totalAmount: 99.50,
          status: 'PAID',
          notes: 'Annual checkup and vaccination',
        },
      }),
      prisma.invoice.create({
        data: {
          invoiceNumber: 'INV-2024-002',
          patientId: patients[4].id, // Rocky
          ownerId: users[5].id, // Lisa Anderson
          clinicId: clinics[1].id,
          issueDate: '2024-01-18',
          dueDate: '2024-02-01',
          subtotal: 150.00,
          taxAmount: 15.00,
          totalAmount: 165.00,
          status: 'SENT',
          notes: 'Consultation and treatment for sprain',
        },
      }),
    ]);

    // Create Invoice Items
    console.log('📄 Creating invoice items...');
    await Promise.all([
      // Invoice 1 Items
      prisma.invoiceItem.create({
        data: {
          invoiceId: invoices[0].id,
          description: 'Annual wellness examination',
          quantity: 1,
          unitPrice: 50.00,
          totalPrice: 50.00,
        },
      }),
      prisma.invoiceItem.create({
        data: {
          invoiceId: invoices[0].id,
          description: 'Rabies vaccine',
          quantity: 1,
          unitPrice: 35.00,
          totalPrice: 35.00,
        },
      }),
      prisma.invoiceItem.create({
        data: {
          invoiceId: invoices[0].id,
          description: 'Examination fee',
          quantity: 1,
          unitPrice: 10.00,
          totalPrice: 10.00,
        },
      }),

      // Invoice 2 Items
      prisma.invoiceItem.create({
        data: {
          invoiceId: invoices[1].id,
          description: 'Consultation fee',
          quantity: 1,
          unitPrice: 75.00,
          totalPrice: 75.00,
        },
      }),
      prisma.invoiceItem.create({
        data: {
          invoiceId: invoices[1].id,
          description: 'X-ray examination',
          quantity: 1,
          unitPrice: 50.00,
          totalPrice: 50.00,
        },
      }),
      prisma.invoiceItem.create({
        data: {
          invoiceId: invoices[1].id,
          description: 'Medication (Carprofen)',
          quantity: 5,
          unitPrice: 5.00,
          totalPrice: 25.00,
        },
      }),
    ]);

    // Create Payments
    console.log('💳 Creating payments...');
    await Promise.all([
      prisma.payment.create({
        data: {
          invoiceId: invoices[0].id,
          amount: 99.50,
          method: 'CASH',
          status: 'SUCCESS',
          transactionId: 'TXN-001',
          notes: 'Paid in cash after consultation',
        },
      }),
    ]);

    console.log('✅ Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Clinics: ${clinics.length}`);
    console.log(`- Users: ${users.length}`);
    console.log(`- Patients: ${patients.length}`);
    console.log(`- Appointments: ${appointments.length}`);
    console.log(`- Medical Records: ${2}`);
    console.log(`- Invoices: ${invoices.length}`);
    console.log(`- Products: ${4}`);

    console.log('\n🔑 Login Credentials:');
    console.log('Super Admin: admin@vetpintar.com / password123');
    console.log('Veterinarian: dr.sarah@happypaws.com / password123');
    console.log('Owner: john.owner@happypaws.com / password123');
    console.log('Staff: mary.staff@happypaws.com / password123');
    console.log('Veterinarian 2: dr.mike@carecure.com / password123');
    console.log('Owner 2: lisa.owner@carecure.com / password123');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding function
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('🎉 Seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

export default seedDatabase;
import { PrismaClient, UserRole, ClinicAccessRole, ProductCategory } from "@prisma/client";
import { PasswordService } from '../utils/password';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clean up existing data
  await prisma.payment.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.hospitalization.deleteMany();
  await prisma.medicalRecord.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.product.deleteMany();
  await prisma.clinicAccess.deleteMany();
  await prisma.clinic.deleteMany();
  await prisma.user.deleteMany();

  console.log('🗑️  Cleaned up existing data');

  // Create demo clinic
  const clinic = await prisma.clinic.create({
    data: {
      name: 'VetPintar Demo Clinic',
      email: 'demo@vetpintar.com',
      phone: '+62-21-1234-5678',
      address: '123 Main Street',
      city: 'Jakarta',
      province: 'DKI Jakarta',
      postalCode: '12345',
      subscriptionStatus: 'ACTIVE'
    }
  });

  console.log('🏥 Created demo clinic:', clinic.name);

  // Create admin user
  const adminPassword = await PasswordService.hash('admin123');
  const admin = await prisma.user.create({
    data: {
      email: 'admin@vetpintar.com',
      passwordHash: adminPassword,
      name: 'Admin User',
      phone: '+62-21-9876-5432',
      role: 'SUPER_ADMIN',
      isActive: true
    }
  });

  // Give admin access to clinic
  await prisma.clinicAccess.create({
    data: {
      userId: admin.id,
      clinicId: clinic.id,
      accessRole: 'OWNER'
    }
  });

  console.log('👤 Created admin user:', admin.email);

  // Create veterinarian user
  const vetPassword = await PasswordService.hash('vet123');
  const veterinarian = await prisma.user.create({
    data: {
      email: 'vet@vetpintar.com',
      passwordHash: vetPassword,
      name: 'Dr. Sarah Johnson',
      phone: '+62-21-5555-1234',
      role: 'VETERINARIAN',
      isActive: true
    }
  });

  // Give vet access to clinic
  await prisma.clinicAccess.create({
    data: {
      userId: veterinarian.id,
      clinicId: clinic.id,
      accessRole: 'VETERINARIAN'
    }
  });

  console.log('👨‍⚕️ Created veterinarian user:', veterinarian.email);

  // Create staff user
  const staffPassword = await PasswordService.hash('staff123');
  const staff = await prisma.user.create({
    data: {
      email: 'staff@vetpintar.com',
      passwordHash: staffPassword,
      name: 'Staff Member',
      phone: '+62-21-5555-5678',
      role: 'STAFF',
      isActive: true
    }
  });

  // Give staff access to clinic
  await prisma.clinicAccess.create({
    data: {
      userId: staff.id,
      clinicId: clinic.id,
      accessRole: 'STAFF'
    }
  });

  console.log('👥 Created staff user:', staff.email);

  // Create sample products
  const products = [
    {
      name: 'Dog Vaccine - DHPP',
      description: 'Distemper, Hepatitis, Parainfluenza, Parvovirus vaccine',
      category: ProductCategory.VACCINE,
      unit: 'dose',
      price: 150000,
      stockQuantity: 50,
      minStockAlert: 10,
      sku: 'VAC-DHPP-001'
    },
    {
      name: 'Cat Vaccine - FVRCP',
      description: 'Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia vaccine',
      category: ProductCategory.VACCINE,
      unit: 'dose',
      price: 120000,
      stockQuantity: 30,
      minStockAlert: 5,
      sku: 'VAC-FVRCP-001'
    },
    {
      name: 'Antibiotic - Amoxicillin',
      description: 'Broad-spectrum antibiotic for bacterial infections',
      category: ProductCategory.MEDICINE,
      unit: 'box',
      price: 75000,
      stockQuantity: 20,
      minStockAlert: 5,
      sku: 'MED-AMOX-001'
    },
    {
      name: 'Premium Dog Food',
      description: 'Nutritionally balanced dry food for adult dogs',
      category: ProductCategory.FOOD,
      unit: 'kg',
      price: 80000,
      stockQuantity: 100,
      minStockAlert: 20,
      sku: 'FOOD-DOG-001'
    }
  ];

  for (const product of products) {
    await prisma.product.create({
      data: {
        ...product,
        clinicId: clinic.id
      }
    });
  }

  console.log('💊 Created sample products');

  // Create sample patients
  const ownerPassword = await PasswordService.hash('owner123');
  const owner = await prisma.user.create({
    data: {
      email: 'owner@vetpintar.com',
      passwordHash: ownerPassword,
      name: 'Pet Owner',
      phone: '+62-21-9999-8888',
      role: 'CUSTOMER',
      isActive: true
    }
  });

  // Give owner access to clinic
  await prisma.clinicAccess.create({
    data: {
      userId: owner.id,
      clinicId: clinic.id,
      accessRole: 'VIEWER'
    }
  });

  const patients = [
    {
      name: 'Max',
      species: 'Dog',
      breed: 'Golden Retriever',
      gender: 'Male',
      birthDate: new Date('2020-05-15'),
      color: 'Golden',
      ownerId: owner.id
    },
    {
      name: 'Luna',
      species: 'Cat',
      breed: 'Persian',
      gender: 'Female',
      birthDate: new Date('2021-08-22'),
      color: 'White',
      ownerId: owner.id
    }
  ];

  for (const patient of patients) {
    await prisma.patient.create({
      data: {
        ...patient,
        clinicId: clinic.id
      }
    });
  }

  console.log('🐕 Created sample patients');

  // Create sample appointments
  const createdPatients = await prisma.patient.findMany({ where: { clinicId: clinic.id } });

  const appointments = [
    {
      patientId: createdPatients[0].id,
      veterinarianId: veterinarian.id,
      appointmentDate: new Date('2024-01-15'),
      appointmentTime: '10:00',
      type: 'Annual Checkup',
      status: 'COMPLETED' as const,
      reason: 'Annual checkup and vaccination',
      notes: 'Patient is healthy, all vaccinations up to date'
    },
    {
      patientId: createdPatients[1].id,
      veterinarianId: veterinarian.id,
      appointmentDate: new Date('2024-01-20'),
      appointmentTime: '14:30',
      type: 'Consultation',
      status: 'SCHEDULED' as const,
      reason: 'Skin irritation and excessive scratching'
    },
    {
      patientId: createdPatients[0].id,
      veterinarianId: veterinarian.id,
      appointmentDate: new Date('2024-01-25'),
      appointmentTime: '11:00',
      type: 'Follow-up',
      status: 'SCHEDULED' as const,
      reason: 'Follow-up checkup'
    }
  ];

  for (const appointment of appointments) {
    await prisma.appointment.create({
      data: {
        ...appointment,
        clinicId: clinic.id
      }
    });
  }

  console.log('📅 Created sample appointments');

  // Create sample medical records
  const medicalRecords = [
    {
      patientId: createdPatients[0].id,
      veterinarianId: veterinarian.id,
      visitDate: new Date('2024-01-15T10:00:00Z'),
      chiefComplaint: 'Annual checkup and vaccination',
      diagnosis: 'Healthy, no issues found',
      treatment: 'Rabies vaccine booster, annual wellness exam',
      prescription: 'No medication needed',
      weight: 32.5,
      temperature: 38.5,
      status: 'DISCHARGED' as const
    }
  ];

  for (const record of medicalRecords) {
    await prisma.medicalRecord.create({
      data: {
        ...record,
        clinicId: clinic.id
      }
    });
  }

  console.log('📋 Created sample medical records');

  // Create sample invoices
  const invoices = [
    {
      invoiceNumber: 'INV-2024-001',
      patientId: createdPatients[0].id,
      ownerId: owner.id,
      issueDate: new Date('2024-01-15'),
      dueDate: new Date('2024-01-29'),
      subtotal: 295000,
      taxAmount: 29500,
      totalAmount: 324500,
      status: 'PAID' as const,
      notes: 'Annual checkup and vaccination'
    },
    {
      invoiceNumber: 'INV-2024-002',
      patientId: createdPatients[1].id,
      ownerId: owner.id,
      issueDate: new Date('2024-01-20'),
      dueDate: new Date('2024-02-03'),
      subtotal: 150000,
      taxAmount: 15000,
      totalAmount: 165000,
      status: 'SENT' as const,
      notes: 'Consultation for skin irritation'
    }
  ];

  const createdInvoices = [];
  for (const invoice of invoices) {
    const createdInvoice = await prisma.invoice.create({
      data: {
        ...invoice,
        clinicId: clinic.id
      }
    });
    createdInvoices.push(createdInvoice);
  }

  console.log('💰 Created sample invoices');

  // Create invoice items
  const invoiceItems = [
    // Invoice 1 items
    {
      invoiceId: createdInvoices[0].id,
      description: 'Annual wellness examination',
      quantity: 1,
      unitPrice: 150000,
      totalPrice: 150000
    },
    {
      invoiceId: createdInvoices[0].id,
      description: 'DHPP Vaccine',
      quantity: 1,
      unitPrice: 120000,
      totalPrice: 120000
    },
    {
      invoiceId: createdInvoices[0].id,
      description: 'Rabies Vaccine',
      quantity: 1,
      unitPrice: 100000,
      totalPrice: 100000
    },
    // Invoice 2 items
    {
      invoiceId: createdInvoices[1].id,
      description: 'Consultation fee',
      quantity: 1,
      unitPrice: 100000,
      totalPrice: 100000
    },
    {
      invoiceId: createdInvoices[1].id,
      description: 'Skin examination',
      quantity: 1,
      unitPrice: 50000,
      totalPrice: 50000
    }
  ];

  for (const item of invoiceItems) {
    await prisma.invoiceItem.create({
      data: item
    });
  }

  console.log('📄 Created invoice items');

  console.log('✅ Database seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`- Clinic: 1`);
  console.log(`- Users: 4 (Admin, Veterinarian, Staff, Owner)`);
  console.log(`- Patients: ${createdPatients.length}`);
  console.log(`- Appointments: ${appointments.length}`);
  console.log(`- Medical Records: ${medicalRecords.length}`);
  console.log(`- Invoices: ${invoices.length}`);
  console.log(`- Products: ${products.length}`);

  console.log('\n🔑 Login credentials:');
  console.log('Admin: admin@vetpintar.com / admin123');
  console.log('Veterinarian: vet@vetpintar.com / vet123');
  console.log('Staff: staff@vetpintar.com / staff123');
  console.log('Owner: owner@vetpintar.com / owner123');

  console.log('\n🎯 Ready for testing!');
  console.log('- Login as admin to access all features');
  console.log('- Login as veterinarian to manage appointments and medical records');
  console.log('- Login as staff to manage appointments and inventory');
  console.log('- Login as owner to view patient information');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
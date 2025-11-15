import { PrismaClient } from '@prisma/client';
import { createFactories } from '../factories';
import { faker } from '../config/faker';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding with factories...');

  // Clean up existing data
  await prisma.payment.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.hospitalization.deleteMany();
  await prisma.medicalRecord.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.product.deleteMany();
  await prisma.clinicAccess.deleteMany();
  await prisma.clinic.deleteMany();
  await prisma.user.deleteMany();

  console.log('🗑️  Cleaned up existing data');

  const factory = createFactories(prisma);

  // Create clinics
  console.log('🏥 Creating clinics...');
  const clinics = await factory.clinic.createMany(3);
  const mainClinic = clinics[0];
  console.log(`   Created ${clinics.length} clinics`);

  // Create admin
  console.log('👤 Creating admin user...');
  const admin = await factory.user.createAdmin({
    email: 'admin@vetpintar.com',
    name: 'Super Admin',
  });

  await prisma.clinicAccess.create({
    data: {
      userId: admin.id,
      clinicId: mainClinic.id,
      accessRole: 'OWNER',
    },
  });
  console.log(`   Admin: ${admin.email} / admin123`);

  // Create veterinarians for main clinic
  console.log('👨‍⚕️ Creating veterinarians...');
  const vets = await Promise.all([
    factory.user.createVeterinarian({
      email: 'vet@vetpintar.com',
      name: 'Dr. Sarah Johnson',
    }),
    factory.user.createVeterinarian(),
    factory.user.createVeterinarian(),
  ]);

  for (const vet of vets) {
    await prisma.clinicAccess.create({
      data: {
        userId: vet.id,
        clinicId: mainClinic.id,
        accessRole: 'VETERINARIAN',
      },
    });
  }
  console.log(`   Created ${vets.length} veterinarians`);

  // Create staff
  console.log('👥 Creating staff...');
  const staffMembers = await Promise.all([
    factory.user.createStaff({
      email: 'staff@vetpintar.com',
      name: 'Staff Member',
    }),
    factory.user.createStaff(),
  ]);

  for (const staff of staffMembers) {
    await prisma.clinicAccess.create({
      data: {
        userId: staff.id,
        clinicId: mainClinic.id,
        accessRole: 'STAFF',
      },
    });
  }
  console.log(`   Created ${staffMembers.length} staff members`);

  // Create customers (pet owners)
  console.log('🧑 Creating customers...');
  const customers = await Promise.all([
    factory.user.createCustomer({
      email: 'owner@vetpintar.com',
      name: 'Pet Owner',
    }),
    ...Array.from({ length: 9 }, () => factory.user.createCustomer()),
  ]);

  for (const customer of customers) {
    await prisma.clinicAccess.create({
      data: {
        userId: customer.id,
        clinicId: mainClinic.id,
        accessRole: 'VIEWER',
      },
    });
  }
  console.log(`   Created ${customers.length} customers`);

  // Create products
  console.log('💊 Creating products...');
  const products = await Promise.all([
    // Medicines
    ...Array.from({ length: 10 }, () => factory.product.createMedicine(mainClinic.id)),
    // Vaccines
    ...Array.from({ length: 8 }, () => factory.product.createVaccine(mainClinic.id)),
    // Food
    ...Array.from({ length: 12 }, () => factory.product.createFood(mainClinic.id)),
    // Random categories
    ...Array.from({ length: 15 }, () => factory.product.create({ clinicId: mainClinic.id })),
  ]);
  console.log(`   Created ${products.length} products`);

  // Create patients for each customer
  console.log('🐕 Creating patients...');
  let totalPatients = 0;

  for (const customer of customers) {
    const patientCount = faker.number.int({ min: 1, max: 4 });

    for (let i = 0; i < patientCount; i++) {
      const isDog = Math.random() > 0.5;

      if (isDog) {
        await factory.patient.createDog(customer.id, mainClinic.id);
      } else {
        await factory.patient.createCat(customer.id, mainClinic.id);
      }

      totalPatients++;
    }
  }
  console.log(`   Created ${totalPatients} patients`);

  // Create appointments
  console.log('📅 Creating appointments...');
  const patients = await prisma.patient.findMany({
    where: { clinicId: mainClinic.id },
  });

  const appointments = await Promise.all(
    patients.slice(0, 20).map((patient) =>
      factory.appointment.create({
        patientId: patient.id,
        veterinarianId: faker.helpers.arrayElement(vets).id,
        clinicId: mainClinic.id,
      })
    )
  );
  console.log(`   Created ${appointments.length} appointments`);

  // Summary
  console.log('\n✅ Database seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`   Clinics: ${clinics.length}`);
  console.log(`   Users: ${1 + vets.length + staffMembers.length + customers.length} total`);
  console.log(`     - Admin: 1`);
  console.log(`     - Veterinarians: ${vets.length}`);
  console.log(`     - Staff: ${staffMembers.length}`);
  console.log(`     - Customers: ${customers.length}`);
  console.log(`   Patients: ${totalPatients}`);
  console.log(`   Products: ${products.length}`);
  console.log(`   Appointments: ${appointments.length}`);

  console.log('\n🔑 Login credentials:');
  console.log('   Admin: admin@vetpintar.com / admin123');
  console.log('   Veterinarian: vet@vetpintar.com / vet123');
  console.log('   Staff: staff@vetpintar.com / staff123');
  console.log('   Customer: owner@vetpintar.com / customer123');

  console.log('\n🎯 All users password: Use role-specific password (admin123, vet123, staff123, customer123)');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

# Factories

Factory pattern untuk generate fake data menggunakan @faker-js/faker dengan localization Indonesia.

## Struktur

- `baseFactory.ts` - Base class untuk semua factories
- `userFactory.ts` - Factory untuk User
- `clinicFactory.ts` - Factory untuk Clinic
- `patientFactory.ts` - Factory untuk Patient
- `productFactory.ts` - Factory untuk Product
- `appointmentFactory.ts` - Factory untuk Appointment
- `index.ts` - Export semua factories

## Cara Pakai

### Basic Usage

```typescript
import { createFactories } from './factories';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const factory = createFactories(prisma);

// Create single item
const user = await factory.user.create();
const clinic = await factory.clinic.create();

// Create with overrides
const admin = await factory.user.create({
  email: 'admin@example.com',
  role: 'SUPER_ADMIN'
});

// Create multiple items
const users = await factory.user.createMany(10);
```

### Specific Factory Methods

```typescript
// User Factory
const admin = await factory.user.createAdmin();
const vet = await factory.user.createVeterinarian();
const staff = await factory.user.createStaff();
const customer = await factory.user.createCustomer();

// Patient Factory
const dog = await factory.patient.createDog(ownerId, clinicId);
const cat = await factory.patient.createCat(ownerId, clinicId);

// Product Factory
const medicine = await factory.product.createMedicine(clinicId);
const vaccine = await factory.product.createVaccine(clinicId);
const food = await factory.product.createFood(clinicId);
```

### Make Without Persisting

```typescript
// Generate data without saving to DB
const userData = factory.user.make();
const clinicData = factory.clinic.make({ name: 'Custom Clinic' });

// Generate multiple
const usersData = factory.user.makeMany(5);
```

## Indonesian Localization

Faker sudah dikonfigurasi dengan locale Indonesia di `src/config/faker.ts`:

```typescript
import { faker, fakerID } from '../config/faker';

// Custom Indonesian helpers
fakerID.phone()          // '081234567890'
fakerID.phoneFormatted() // '+62-81-1234-5678'
fakerID.city()           // 'Jakarta'
fakerID.province()       // 'DKI Jakarta'
fakerID.address()        // 'Jalan Sudirman No. 123'
fakerID.clinicName()     // 'Klinik Hewan Sehat'
```

## Seeding Database

Run seeder dengan factories:

```bash
npm run db:seed:factory
```

Atau manual seeder lama:

```bash
npm run db:seed
```

## Extend Factory

Buat factory baru:

```typescript
import { BaseFactory } from './baseFactory';
import { faker } from '../config/faker';

interface InvoiceData {
  // ...
}

export class InvoiceFactory extends BaseFactory<InvoiceData> {
  make(overrides?: Partial<InvoiceData>): InvoiceData {
    return {
      invoiceNumber: `INV-${faker.string.numeric(6)}`,
      // ...
      ...overrides,
    };
  }

  protected async persist(data: InvoiceData): Promise<any> {
    return this.prisma.invoice.create({ data });
  }
}
```

Tambahkan ke `index.ts`:

```typescript
export class FactoryManager {
  // ...
  public invoice: InvoiceFactory;

  constructor(prisma: PrismaClient) {
    // ...
    this.invoice = new InvoiceFactory(prisma);
  }
}
```

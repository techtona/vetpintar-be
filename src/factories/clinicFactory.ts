import { PrismaClient, SubscriptionStatus } from '@prisma/client';
import { BaseFactory } from './baseFactory';
import { faker, fakerID } from '../config/faker';

interface ClinicData {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  subscriptionStatus: SubscriptionStatus;
  isActive: boolean;
}

export class ClinicFactory extends BaseFactory<ClinicData> {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  make(overrides?: Partial<ClinicData>): ClinicData {
    const city = fakerID.city();
    const province = fakerID.province();

    return {
      name: fakerID.clinicName(),
      email: faker.internet.email(),
      phone: fakerID.phoneFormatted(),
      address: fakerID.address(),
      city,
      province,
      postalCode: fakerID.postalCode(),
      subscriptionStatus: 'ACTIVE',
      isActive: true,
      ...overrides,
    };
  }

  protected async persist(data: ClinicData): Promise<any> {
    return this.prisma.clinic.create({ data });
  }
}

import { PrismaClient, UserRole } from '@prisma/client';
import { BaseFactory } from './baseFactory';
import { PasswordService } from '../utils/password';
import { faker, fakerID } from '../config/faker';

interface UserData {
  email: string;
  passwordHash: string;
  name: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
}

export class UserFactory extends BaseFactory<UserData> {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  make(overrides?: Partial<UserData>): UserData {
    const name = faker.person.fullName();
    return {
      email: fakerID.email(name),
      passwordHash: '', // Will be set in create
      name,
      phone: fakerID.phoneFormatted(),
      role: faker.helpers.arrayElement(['VETERINARIAN', 'STAFF', 'CUSTOMER'] as UserRole[]),
      isActive: true,
      ...overrides,
    };
  }

  override async create(overrides?: Partial<UserData>): Promise<any> {
    const data = this.make(overrides);

    // Hash password if not provided
    if (!data.passwordHash) {
      data.passwordHash = await PasswordService.hash('password123');
    }

    return this.persist(data);
  }

  protected async persist(data: UserData): Promise<any> {
    return this.prisma.user.create({ data });
  }

  async createAdmin(overrides?: Partial<UserData>): Promise<any> {
    const passwordHash = await PasswordService.hash('admin123');
    return this.create({
      role: 'SUPER_ADMIN',
      passwordHash,
      ...overrides,
    });
  }

  async createVeterinarian(overrides?: Partial<UserData>): Promise<any> {
    const passwordHash = await PasswordService.hash('vet123');
    return this.create({
      role: 'VETERINARIAN',
      name: `Dr. ${faker.person.fullName()}`,
      passwordHash,
      ...overrides,
    });
  }

  async createStaff(overrides?: Partial<UserData>): Promise<any> {
    const passwordHash = await PasswordService.hash('staff123');
    return this.create({
      role: 'STAFF',
      passwordHash,
      ...overrides,
    });
  }

  async createCustomer(overrides?: Partial<UserData>): Promise<any> {
    const passwordHash = await PasswordService.hash('customer123');
    return this.create({
      role: 'CUSTOMER',
      passwordHash,
      ...overrides,
    });
  }
}

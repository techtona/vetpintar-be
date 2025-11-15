import { PrismaClient } from '@prisma/client';
import { UserFactory } from './userFactory';
import { ClinicFactory } from './clinicFactory';
import { PatientFactory } from './patientFactory';
import { ProductFactory } from './productFactory';
import { AppointmentFactory } from './appointmentFactory';

export class FactoryManager {
  public user: UserFactory;
  public clinic: ClinicFactory;
  public patient: PatientFactory;
  public product: ProductFactory;
  public appointment: AppointmentFactory;

  constructor(prisma: PrismaClient) {
    this.user = new UserFactory(prisma);
    this.clinic = new ClinicFactory(prisma);
    this.patient = new PatientFactory(prisma);
    this.product = new ProductFactory(prisma);
    this.appointment = new AppointmentFactory(prisma);
  }
}

export function createFactories(prisma: PrismaClient): FactoryManager {
  return new FactoryManager(prisma);
}

export * from './userFactory';
export * from './clinicFactory';
export * from './patientFactory';
export * from './productFactory';
export * from './appointmentFactory';
export * from './baseFactory';

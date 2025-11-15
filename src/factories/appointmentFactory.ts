import { faker } from '../config/faker';
import { PrismaClient, AppointmentStatus } from '@prisma/client';
import { BaseFactory } from './baseFactory';

interface AppointmentData {
  patientId: string;
  veterinarianId: string;
  clinicId: string;
  appointmentDate: Date;
  appointmentTime: string;
  type: string;
  status: AppointmentStatus;
  reason?: string;
  notes?: string;
}

const APPOINTMENT_TYPES = [
  'Consultation',
  'Annual Checkup',
  'Vaccination',
  'Surgery',
  'Follow-up',
  'Emergency',
  'Grooming',
  'Dental',
];

const APPOINTMENT_REASONS = [
  'Annual wellness examination',
  'Vaccination booster',
  'Skin irritation and scratching',
  'Digestive issues',
  'Follow-up after surgery',
  'Dental cleaning',
  'Ear infection',
  'Limping or mobility issues',
];

export class AppointmentFactory extends BaseFactory<AppointmentData> {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  make(overrides?: Partial<AppointmentData>): AppointmentData {
    const appointmentDate = faker.date.between({
      from: new Date(),
      to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next 30 days
    });

    const hour = faker.number.int({ min: 8, max: 17 });
    const minute = faker.helpers.arrayElement(['00', '15', '30', '45']);
    const appointmentTime = `${hour.toString().padStart(2, '0')}:${minute}`;

    return {
      patientId: '',
      veterinarianId: '',
      clinicId: '',
      appointmentDate,
      appointmentTime,
      type: faker.helpers.arrayElement(APPOINTMENT_TYPES),
      status: faker.helpers.arrayElement(['SCHEDULED', 'CONFIRMED', 'COMPLETED'] as AppointmentStatus[]),
      reason: faker.helpers.arrayElement(APPOINTMENT_REASONS),
      notes: Math.random() < 0.3 ? faker.lorem.sentence() : undefined,
      ...overrides,
    };
  }

  protected async persist(data: AppointmentData): Promise<any> {
    return this.prisma.appointment.create({ data });
  }
}

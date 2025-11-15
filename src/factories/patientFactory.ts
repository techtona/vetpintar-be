import { faker } from '../config/faker';
import { PrismaClient } from '@prisma/client';
import { BaseFactory } from './baseFactory';

interface PatientData {
  name: string;
  species: string;
  breed?: string;
  gender?: string;
  birthDate?: Date;
  color?: string;
  microchipId?: string;
  photoUrl?: string;
  ownerId: string;
  clinicId: string;
  isActive: boolean;
}

const DOG_BREEDS = [
  'Golden Retriever', 'Labrador', 'German Shepherd', 'Bulldog',
  'Poodle', 'Beagle', 'Husky', 'Chihuahua', 'Pug'
];

const CAT_BREEDS = [
  'Persian', 'Maine Coon', 'Siamese', 'Ragdoll',
  'British Shorthair', 'Scottish Fold', 'Sphynx', 'Bengal'
];

const PET_COLORS = [
  'Black', 'White', 'Brown', 'Golden', 'Gray',
  'Orange', 'Cream', 'Mixed', 'Spotted', 'Striped'
];

export class PatientFactory extends BaseFactory<PatientData> {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  make(overrides?: Partial<PatientData>): PatientData {
    const species = overrides?.species || faker.helpers.arrayElement(['Dog', 'Cat', 'Bird', 'Rabbit']);
    const isDog = species === 'Dog';
    const isCat = species === 'Cat';

    let breed = '';
    if (isDog) breed = faker.helpers.arrayElement(DOG_BREEDS);
    else if (isCat) breed = faker.helpers.arrayElement(CAT_BREEDS);
    else breed = 'Mixed';

    return {
      name: faker.person.firstName(),
      species,
      breed,
      gender: faker.helpers.arrayElement(['Male', 'Female']),
      birthDate: faker.date.past({ years: 10 }),
      color: faker.helpers.arrayElement(PET_COLORS),
      microchipId: Math.random() < 0.5 ? faker.string.numeric(15) : undefined,
      photoUrl: undefined,
      ownerId: '',
      clinicId: '',
      isActive: true,
      ...overrides,
    };
  }

  protected async persist(data: PatientData): Promise<any> {
    return this.prisma.patient.create({ data });
  }

  async createDog(ownerId: string, clinicId: string, overrides?: Partial<PatientData>): Promise<any> {
    return this.create({
      species: 'Dog',
      breed: faker.helpers.arrayElement(DOG_BREEDS),
      ownerId,
      clinicId,
      ...overrides,
    });
  }

  async createCat(ownerId: string, clinicId: string, overrides?: Partial<PatientData>): Promise<any> {
    return this.create({
      species: 'Cat',
      breed: faker.helpers.arrayElement(CAT_BREEDS),
      ownerId,
      clinicId,
      ...overrides,
    });
  }
}

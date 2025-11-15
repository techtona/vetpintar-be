import { faker } from '../config/faker';
import { PrismaClient, ProductCategory } from '@prisma/client';
import { BaseFactory } from './baseFactory';

interface ProductData {
  name: string;
  description?: string;
  category: ProductCategory;
  unit?: string;
  price: number;
  stockQuantity: number;
  minStockAlert?: number;
  expiryDate?: Date;
  sku?: string;
  barcode?: string;
  photoUrl?: string;
  clinicId: string;
  isActive: boolean;
}

const PRODUCT_TEMPLATES: Record<ProductCategory, Array<{ name: string; unit: string; price: number }>> = {
  MEDICINE: [
    { name: 'Amoxicillin', unit: 'box', price: 75000 },
    { name: 'Doxycycline', unit: 'box', price: 85000 },
    { name: 'Cephalexin', unit: 'box', price: 95000 },
    { name: 'Metronidazole', unit: 'box', price: 65000 },
  ],
  VACCINE: [
    { name: 'DHPP Vaccine', unit: 'dose', price: 150000 },
    { name: 'Rabies Vaccine', unit: 'dose', price: 120000 },
    { name: 'FVRCP Vaccine', unit: 'dose', price: 140000 },
    { name: 'Bordetella Vaccine', unit: 'dose', price: 100000 },
  ],
  FOOD: [
    { name: 'Premium Dog Food', unit: 'kg', price: 80000 },
    { name: 'Premium Cat Food', unit: 'kg', price: 75000 },
    { name: 'Puppy Formula', unit: 'kg', price: 90000 },
    { name: 'Senior Dog Food', unit: 'kg', price: 85000 },
  ],
  ACCESSORY: [
    { name: 'Leash', unit: 'pcs', price: 50000 },
    { name: 'Collar', unit: 'pcs', price: 35000 },
    { name: 'Pet Bed', unit: 'pcs', price: 200000 },
    { name: 'Food Bowl', unit: 'pcs', price: 45000 },
  ],
  SERVICE: [
    { name: 'Grooming Service', unit: 'session', price: 100000 },
    { name: 'Bathing Service', unit: 'session', price: 50000 },
    { name: 'Nail Trimming', unit: 'session', price: 30000 },
    { name: 'Health Check', unit: 'session', price: 150000 },
  ],
  CONSUMABLE: [
    { name: 'Bandage', unit: 'roll', price: 15000 },
    { name: 'Cotton Swab', unit: 'pack', price: 10000 },
    { name: 'Syringe', unit: 'pcs', price: 5000 },
    { name: 'Surgical Gloves', unit: 'box', price: 25000 },
    { name: 'Gauze Pad', unit: 'pack', price: 20000 },
    { name: 'Medical Tape', unit: 'roll', price: 12000 },
  ],
};

export class ProductFactory extends BaseFactory<ProductData> {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  make(overrides?: Partial<ProductData>): ProductData {
    const category = overrides?.category || faker.helpers.arrayElement(Object.keys(PRODUCT_TEMPLATES) as ProductCategory[]);
    const templates = PRODUCT_TEMPLATES[category] || [];
    const template = templates.length > 0 ? faker.helpers.arrayElement(templates) : null;

    const categoryPrefix = category.slice(0, 3).toUpperCase();
    const sku = `${categoryPrefix}-${faker.string.alphanumeric(8).toUpperCase()}`;

    return {
      name: template?.name || faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      category,
      unit: template?.unit || 'pcs',
      price: template?.price || faker.number.int({ min: 50000, max: 500000 }),
      stockQuantity: faker.number.int({ min: 10, max: 200 }),
      minStockAlert: faker.number.int({ min: 5, max: 20 }),
      expiryDate: Math.random() < 0.3 ? faker.date.future({ years: 2 }) : undefined,
      sku,
      barcode: faker.string.numeric(13),
      photoUrl: undefined,
      clinicId: '',
      isActive: true,
      ...overrides,
    };
  }

  protected async persist(data: ProductData): Promise<any> {
    return this.prisma.product.create({ data });
  }

  async createMedicine(clinicId: string, overrides?: Partial<ProductData>): Promise<any> {
    return this.create({
      category: 'MEDICINE',
      clinicId,
      ...overrides,
    });
  }

  async createVaccine(clinicId: string, overrides?: Partial<ProductData>): Promise<any> {
    return this.create({
      category: 'VACCINE',
      clinicId,
      ...overrides,
    });
  }

  async createFood(clinicId: string, overrides?: Partial<ProductData>): Promise<any> {
    return this.create({
      category: 'FOOD',
      clinicId,
      ...overrides,
    });
  }
}

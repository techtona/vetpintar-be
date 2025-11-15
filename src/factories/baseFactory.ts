import { PrismaClient } from '@prisma/client';

export abstract class BaseFactory<T> {
  protected prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  abstract make(overrides?: Partial<T>): T;

  async create(overrides?: Partial<T>): Promise<any> {
    const data = this.make(overrides);
    return this.persist(data);
  }

  async createMany(count: number, overrides?: Partial<T>): Promise<any[]> {
    const items = [];
    for (let i = 0; i < count; i++) {
      const item = await this.create(overrides);
      items.push(item);
    }
    return items;
  }

  protected abstract persist(data: T): Promise<any>;

  makeMany(count: number, overrides?: Partial<T>): T[] {
    return Array.from({ length: count }, () => this.make(overrides));
  }
}

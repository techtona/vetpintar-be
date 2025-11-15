import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';

export interface BaseServiceConfig {
  modelName: string;
  includeRelations?: any;
  searchFields?: string[];
  useClinicId?: boolean;
  useSoftDelete?: boolean;
  uniqueFields?: string[];
  defaultOrderBy?: any;
}

export interface PaginatedQuery {
  page?: number;
  limit?: number;
  search?: string;
  clinicId?: string;
  isActive?: boolean;
  [key: string]: any;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

export class BaseService<T = any> {
  protected prisma: PrismaClient;
  protected config: BaseServiceConfig;

  constructor(prisma: PrismaClient, config: BaseServiceConfig) {
    this.prisma = prisma;
    this.config = {
      useClinicId: true,
      useSoftDelete: true,
      defaultOrderBy: { createdAt: 'desc' },
      ...config,
    };
  }

  protected getModel() {
    return (this.prisma as any)[this.config.modelName];
  }

  protected buildWhereClause(filters: any = {}): any {
    const where: any = {};

    if (this.config.useClinicId && filters.clinicId) {
      where.clinicId = filters.clinicId;
    }

    if (this.config.useSoftDelete && filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    // Add search conditions
    if (filters.search && this.config.searchFields) {
      where.OR = this.config.searchFields.map((field) => ({
        [field]: { contains: filters.search, mode: 'insensitive' },
      }));
    }

    // Remove handled fields from filters
    const { clinicId, isActive, search, page, limit, ...restFilters } = filters;

    // Add remaining filters
    Object.assign(where, restFilters);

    return where;
  }

  async create(data: any): Promise<T> {
    try {
      // Check unique constraints
      if (this.config.uniqueFields) {
        for (const field of this.config.uniqueFields) {
          if (data[field]) {
            const existing = await this.getModel().findFirst({
              where: {
                [field]: data[field],
                ...(this.config.useClinicId && data.clinicId
                  ? { clinicId: data.clinicId }
                  : {}),
              },
            });

            if (existing) {
              throw createError(409, `${this.config.modelName} with this ${field} already exists`);
            }
          }
        }
      }

      const item = await this.getModel().create({
        data,
        include: this.config.includeRelations,
      });

      logger.info(`${this.config.modelName} created: ${item.id}`);
      return item;
    } catch (error) {
      logger.error(`Error creating ${this.config.modelName}:`, error);
      throw error;
    }
  }

  async findMany(query: PaginatedQuery): Promise<PaginatedResult<T>> {
    try {
      const {
        page = 1,
        limit = 20,
        isActive = true,
        ...filters
      } = query;

      const skip = (page - 1) * limit;
      const where = this.buildWhereClause({ ...filters, isActive });

      const [items, total] = await Promise.all([
        this.getModel().findMany({
          where,
          skip,
          take: limit,
          orderBy: this.config.defaultOrderBy,
          include: this.config.includeRelations,
        }),
        this.getModel().count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        items,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error(`Error fetching ${this.config.modelName}s:`, error);
      throw error;
    }
  }

  async findById(id: string, clinicId?: string): Promise<T> {
    try {
      const where: any = { id };

      if (this.config.useClinicId && clinicId) {
        where.clinicId = clinicId;
      }

      const item = await this.getModel().findFirst({
        where,
        include: this.config.includeRelations,
      });

      if (!item) {
        throw createError(404, `${this.config.modelName} not found`);
      }

      return item;
    } catch (error) {
      logger.error(`Error fetching ${this.config.modelName}:`, error);
      throw error;
    }
  }

  async update(id: string, data: any, clinicId?: string): Promise<T> {
    try {
      const where: any = { id };

      if (this.config.useClinicId && clinicId) {
        where.clinicId = clinicId;
      }

      const existing = await this.getModel().findFirst({ where });

      if (!existing) {
        throw createError(404, `${this.config.modelName} not found`);
      }

      // Check unique constraints if updating
      if (this.config.uniqueFields) {
        for (const field of this.config.uniqueFields) {
          if (data[field] && data[field] !== existing[field]) {
            const duplicate = await this.getModel().findFirst({
              where: {
                [field]: data[field],
                ...(this.config.useClinicId && existing.clinicId
                  ? { clinicId: existing.clinicId }
                  : {}),
                id: { not: id },
              },
            });

            if (duplicate) {
              throw createError(409, `${this.config.modelName} with this ${field} already exists`);
            }
          }
        }
      }

      const item = await this.getModel().update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
        include: this.config.includeRelations,
      });

      logger.info(`${this.config.modelName} updated: ${item.id}`);
      return item;
    } catch (error) {
      logger.error(`Error updating ${this.config.modelName}:`, error);
      throw error;
    }
  }

  async delete(id: string, clinicId?: string): Promise<void> {
    try {
      const where: any = { id };

      if (this.config.useClinicId && clinicId) {
        where.clinicId = clinicId;
      }

      const existing = await this.getModel().findFirst({ where });

      if (!existing) {
        throw createError(404, `${this.config.modelName} not found`);
      }

      if (this.config.useSoftDelete) {
        await this.getModel().update({
          where: { id },
          data: {
            isActive: false,
            updatedAt: new Date(),
          },
        });
        logger.info(`${this.config.modelName} soft deleted: ${id}`);
      } else {
        await this.getModel().delete({ where: { id } });
        logger.info(`${this.config.modelName} hard deleted: ${id}`);
      }
    } catch (error) {
      logger.error(`Error deleting ${this.config.modelName}:`, error);
      throw error;
    }
  }

  async count(filters: any = {}): Promise<number> {
    try {
      const where = this.buildWhereClause(filters);
      return await this.getModel().count({ where });
    } catch (error) {
      logger.error(`Error counting ${this.config.modelName}s:`, error);
      throw error;
    }
  }
}

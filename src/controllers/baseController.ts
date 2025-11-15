import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { PrismaClient } from '@prisma/client';

export interface BaseControllerConfig<T = any> {
  modelName: string;
  includeRelations?: any;
  searchFields?: string[];
  defaultOrderBy?: any;
  useClinicId?: boolean;
  useSoftDelete?: boolean;
}

export class BaseController<T = any> {
  protected prisma: PrismaClient;
  protected config: BaseControllerConfig<T>;

  constructor(prisma: PrismaClient, config: BaseControllerConfig<T>) {
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

  protected buildWhereClause(req: AuthenticatedRequest, extraWhere: any = {}) {
    const where: any = { ...extraWhere };

    if (this.config.useClinicId) {
      where.clinicId = req.user?.clinicId;
    }

    if (this.config.useSoftDelete) {
      where.isActive = true;
    }

    return where;
  }

  protected buildSearchWhere(search: string) {
    if (!this.config.searchFields || !search) return {};

    return {
      OR: this.config.searchFields.map((field) => ({
        [field]: { contains: search, mode: 'insensitive' },
      })),
    };
  }

  getAll = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { page = 1, limit = 10, search } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const searchWhere = this.buildSearchWhere(search as string);
      const where = this.buildWhereClause(req, searchWhere);

      const [items, total] = await Promise.all([
        this.getModel().findMany({
          where,
          include: this.config.includeRelations,
          orderBy: this.config.defaultOrderBy,
          skip,
          take: Number(limit),
        }),
        this.getModel().count({ where }),
      ]);

      res.json({
        success: true,
        data: items,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Failed to fetch ${this.config.modelName}s`,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  getById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const where = this.buildWhereClause(req, { id });

      const item = await this.getModel().findFirst({
        where,
        include: this.config.includeRelations,
      });

      if (!item) {
        res.status(404).json({
          success: false,
          message: `${this.config.modelName} not found`,
        });
        return;
      }

      res.json({
        success: true,
        data: item,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Failed to fetch ${this.config.modelName}`,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const data: any = { ...req.body };

      if (this.config.useClinicId) {
        data.clinicId = req.user!.clinicId!;
      }

      const item = await this.getModel().create({
        data,
        include: this.config.includeRelations,
      });

      res.status(201).json({
        success: true,
        message: `${this.config.modelName} created successfully`,
        data: item,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Failed to create ${this.config.modelName}`,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  update = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const where = this.buildWhereClause(req, { id });
      const existing = await this.getModel().findFirst({ where });

      if (!existing) {
        res.status(404).json({
          success: false,
          message: `${this.config.modelName} not found`,
        });
        return;
      }

      const item = await this.getModel().update({
        where: { id },
        data: updateData,
        include: this.config.includeRelations,
      });

      res.json({
        success: true,
        message: `${this.config.modelName} updated successfully`,
        data: item,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Failed to update ${this.config.modelName}`,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  delete = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const where = this.buildWhereClause(req, { id });
      const existing = await this.getModel().findFirst({ where });

      if (!existing) {
        res.status(404).json({
          success: false,
          message: `${this.config.modelName} not found`,
        });
        return;
      }

      if (this.config.useSoftDelete) {
        await this.getModel().update({
          where: { id },
          data: { isActive: false },
        });
      } else {
        await this.getModel().delete({
          where: { id },
        });
      }

      res.json({
        success: true,
        message: `${this.config.modelName} deleted successfully`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Failed to delete ${this.config.modelName}`,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}
import { PrismaClient, Product, ProductCategory } from '../generated/prisma/index';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { prisma } from '../utils/database';
import { io } from '../index';

interface CreateProductData {
  clinicId: string;
  name: string;
  description?: string;
  category: ProductCategory;
  unit?: string;
  price: number;
  stockQuantity?: number;
  minStockAlert?: number;
  expiryDate?: Date;
  sku?: string;
  barcode?: string;
  photoUrl?: string;
}

interface UpdateProductData {
  name?: string;
  description?: string;
  category?: ProductCategory;
  unit?: string;
  price?: number;
  stockQuantity?: number;
  minStockAlert?: number;
  expiryDate?: Date;
  sku?: string;
  barcode?: string;
  photoUrl?: string;
  isActive?: boolean;
}

interface GetProductsQuery {
  page?: number;
  limit?: number;
  clinicId?: string;
  category?: ProductCategory;
  search?: string;
  lowStock?: boolean;
  isActive?: boolean;
  expiring?: boolean;
}

interface StockUpdateData {
  quantity: number;
  operation: 'ADD' | 'SUBTRACT' | 'SET';
  reason?: string;
}

export class ProductService {
  private readonly prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  private generateSKU(clinicId: string, category: ProductCategory): string {
    const categoryPrefix = category.slice(0, 3).toUpperCase();
    const clinicPrefix = clinicId.slice(-4);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${categoryPrefix}-${clinicPrefix}-${random}`;
  }

  async createProduct(data: CreateProductData): Promise<Product> {
    try {
      // Verify clinic exists
      const clinic = await this.prisma.clinic.findUnique({
        where: { id: data.clinicId }
      });

      if (!clinic) {
        throw createError(404, 'Clinic not found');
      }

      // Generate SKU if not provided
      const sku = data.sku || this.generateSKU(data.clinicId, data.category);

      // Check for duplicate SKU
      const existingProduct = await this.prisma.product.findFirst({
        where: {
          sku,
          clinicId: data.clinicId
        }
      });

      if (existingProduct) {
        throw createError(409, 'Product with this SKU already exists');
      }

      const product = await this.prisma.product.create({
        data: {
          ...data,
          sku,
          stockQuantity: data.stockQuantity || 0,
          minStockAlert: data.minStockAlert || 10
        }
      });

      // Check if stock is low
      if (product.stockQuantity <= product.minStockAlert) {
        io.to(`clinic-${data.clinicId}`).emit('low-stock-alert', {
          productId: product.id,
          productName: product.name,
          currentStock: product.stockQuantity,
          minStock: product.minStockAlert
        });
      }

      logger.info(`Product created: ${product.id} for clinic: ${product.clinicId}`);
      return product;
    } catch (error) {
      logger.error('Error creating product:', error);
      throw error;
    }
  }

  async getProducts(query: GetProductsQuery): Promise<{
    products: Product[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        page = 1,
        limit = 20,
        clinicId,
        category,
        search,
        lowStock,
        isActive = true,
        expiring
      } = query;

      const skip = (page - 1) * limit;
      const where: any = { isActive };

      if (clinicId) {
        where.clinicId = clinicId;
      }

      if (category) {
        where.category = category;
      }

      if (lowStock) {
        where.stockQuantity = { lte: this.prisma.product.fields.minStockAlert };
      }

      if (expiring) {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        where.expiryDate = {
          lte: thirtyDaysFromNow,
          gte: new Date()
        };
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [products, total] = await Promise.all([
        this.prisma.product.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            clinic: {
              select: {
                id: true,
                name: true
              }
            },
            _count: {
              select: {
                invoiceItems: true
              }
            }
          }
        }),
        this.prisma.product.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        products,
        total,
        page,
        totalPages
      };
    } catch (error) {
      logger.error('Error fetching products:', error);
      throw error;
    }
  }

  async getProductById(id: string, clinicId?: string): Promise<Product> {
    try {
      const where: any = { id };

      if (clinicId) {
        where.clinicId = clinicId;
      }

      const product = await this.prisma.product.findFirst({
        where,
        include: {
          clinic: {
            select: {
              id: true,
              name: true
            }
          },
          invoiceItems: {
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
              invoice: {
                select: {
                  id: true,
                  invoiceNumber: true,
                  issueDate: true
                }
              }
            }
          },
          _count: {
            select: {
              invoiceItems: true
            }
          }
        }
      });

      if (!product) {
        throw createError(404, 'Product not found');
      }

      return product;
    } catch (error) {
      logger.error('Error fetching product:', error);
      throw error;
    }
  }

  async updateProduct(id: string, data: UpdateProductData, clinicId?: string): Promise<Product> {
    try {
      const where: any = { id };

      if (clinicId) {
        where.clinicId = clinicId;
      }

      const existingProduct = await this.prisma.product.findFirst({
        where
      });

      if (!existingProduct) {
        throw createError(404, 'Product not found');
      }

      // Check for duplicate SKU if updating
      if (data.sku && data.sku !== existingProduct.sku) {
        const duplicateProduct = await this.prisma.product.findFirst({
          where: {
            sku: data.sku,
            clinicId: existingProduct.clinicId,
            id: { not: id }
          }
        });

        if (duplicateProduct) {
          throw createError(409, 'Product with this SKU already exists');
        }
      }

      const updatedProduct = await this.prisma.product.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date()
        }
      });

      // Check if stock is low after update
      if (updatedProduct.stockQuantity <= updatedProduct.minStockAlert) {
        io.to(`clinic-${existingProduct.clinicId}`).emit('low-stock-alert', {
          productId: updatedProduct.id,
          productName: updatedProduct.name,
          currentStock: updatedProduct.stockQuantity,
          minStock: updatedProduct.minStockAlert
        });
      }

      logger.info(`Product updated: ${updatedProduct.id}`);
      return updatedProduct;
    } catch (error) {
      logger.error('Error updating product:', error);
      throw error;
    }
  }

  async updateStock(id: string, data: StockUpdateData, clinicId?: string): Promise<Product> {
    try {
      const where: any = { id };

      if (clinicId) {
        where.clinicId = clinicId;
      }

      const product = await this.prisma.product.findFirst({
        where
      });

      if (!product) {
        throw createError(404, 'Product not found');
      }

      let newStockQuantity: number;

      switch (data.operation) {
        case 'ADD':
          newStockQuantity = product.stockQuantity + data.quantity;
          break;
        case 'SUBTRACT':
          newStockQuantity = Math.max(0, product.stockQuantity - data.quantity);
          break;
        case 'SET':
          newStockQuantity = Math.max(0, data.quantity);
          break;
        default:
          throw createError(400, 'Invalid stock operation');
      }

      const updatedProduct = await this.prisma.product.update({
        where: { id },
        data: {
          stockQuantity: newStockQuantity,
          updatedAt: new Date()
        }
      });

      // Check if stock is low
      if (updatedProduct.stockQuantity <= updatedProduct.minStockAlert) {
        io.to(`clinic-${product.clinicId}`).emit('low-stock-alert', {
          productId: updatedProduct.id,
          productName: updatedProduct.name,
          currentStock: updatedProduct.stockQuantity,
          minStock: updatedProduct.minStockAlert,
          reason: data.reason
        });
      }

      logger.info(`Stock updated for product ${id}: ${data.operation} ${data.quantity} = ${newStockQuantity}`);
      return updatedProduct;
    } catch (error) {
      logger.error('Error updating stock:', error);
      throw error;
    }
  }

  async deleteProduct(id: string, clinicId?: string): Promise<void> {
    try {
      const where: any = { id };

      if (clinicId) {
        where.clinicId = clinicId;
      }

      const product = await this.prisma.product.findFirst({
        where,
        include: {
          _count: {
            select: {
              invoiceItems: true
            }
          }
        }
      });

      if (!product) {
        throw createError(404, 'Product not found');
      }

      // Check if product is used in invoices
      if (product._count.invoiceItems > 0) {
        // Soft delete instead of hard delete
        await this.prisma.product.update({
          where: { id },
          data: {
            isActive: false,
            updatedAt: new Date()
          }
        });

        logger.info(`Product soft deleted: ${id}`);
      } else {
        // Hard delete if not used
        await this.prisma.product.delete({
          where: { id }
        });

        logger.info(`Product hard deleted: ${id}`);
      }
    } catch (error) {
      logger.error('Error deleting product:', error);
      throw error;
    }
  }

  async getLowStockProducts(clinicId: string): Promise<Product[]> {
    try {
      const products = await this.prisma.product.findMany({
        where: {
          clinicId,
          isActive: true,
          stockQuantity: {
            lte: this.prisma.product.fields.minStockAlert
          }
        },
        orderBy: [
          { stockQuantity: 'asc' },
          { name: 'asc' }
        ]
      });

      return products;
    } catch (error) {
      logger.error('Error fetching low stock products:', error);
      throw error;
    }
  }

  async getExpiringProducts(clinicId: string, days: number = 30): Promise<Product[]> {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      const products = await this.prisma.product.findMany({
        where: {
          clinicId,
          isActive: true,
          expiryDate: {
            lte: futureDate,
            gte: new Date()
          }
        },
        orderBy: { expiryDate: 'asc' }
      });

      return products;
    } catch (error) {
      logger.error('Error fetching expiring products:', error);
      throw error;
    }
  }

  async getProductStats(clinicId: string): Promise<{
    totalProducts: number;
    activeProducts: number;
    lowStockProducts: number;
    expiringProducts: number;
    totalValue: number;
    categoryDistribution: Record<string, number>;
  }> {
    try {
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const [
        totalProducts,
        activeProducts,
        lowStockProducts,
        expiringProducts,
        categoryByCount,
        totalValueData
      ] = await Promise.all([
        this.prisma.product.count({
          where: { clinicId }
        }),
        this.prisma.product.count({
          where: { clinicId, isActive: true }
        }),
        this.prisma.product.count({
          where: {
            clinicId,
            isActive: true,
            stockQuantity: {
              lte: this.prisma.product.fields.minStockAlert
            }
          }
        }),
        this.prisma.product.count({
          where: {
            clinicId,
            isActive: true,
            expiryDate: {
              lte: thirtyDaysFromNow,
              gte: now
            }
          }
        }),
        this.prisma.product.groupBy({
          by: ['category'],
          where: { clinicId, isActive: true },
          _count: { category: true }
        }),
        this.prisma.product.aggregate({
          where: { clinicId, isActive: true },
          _sum: {
            stockQuantity: {
              then: (stock) => ({ multiply: [stock, 'price'] })
            }
          }
        })
      ]);

      const categoryDistribution = categoryByCount.reduce((acc, item) => {
        acc[item.category] = item._count.category;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalProducts,
        activeProducts,
        lowStockProducts,
        expiringProducts,
        totalValue: 0, // TODO: Calculate total inventory value properly
        categoryDistribution
      };
    } catch (error) {
      logger.error('Error fetching product stats:', error);
      throw error;
    }
  }
}

export const productService = new ProductService();
import { Response } from 'express';
import { AuthenticatedRequest, PaginationParams } from '../types';
import { prisma } from '../utils/database';
import { ProductCategory } from "@prisma/client";

interface CreateProductRequest {
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
}

interface UpdateProductRequest extends Partial<CreateProductRequest> {
  isActive?: boolean;
}

class ProductController {
  // GET /api/products
  getAllProducts = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { page = 1, limit = 10, search, category, lowStock } = req.query as PaginationParams & {
        search?: string;
        category?: ProductCategory;
        lowStock?: string;
      };

      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {
        clinicId: req.user?.clinicId,
        isActive: true,
      };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (category) where.category = category;

      if (lowStock === 'true') {
        where.stockQuantity = {
          lte: prisma.product.fields.minStockAlert,
        };
      }

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit),
        }),
        prisma.product.count({ where }),
      ]);

      res.json({
        success: true,
        data: products,
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
        message: 'Failed to fetch products',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // GET /api/products/:id
  getProductById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const product = await prisma.product.findFirst({
        where: {
          id,
          clinicId: req.user?.clinicId,
        },
      });

      if (!product) {
        res.status(404).json({
          success: false,
          message: 'Product not found',
        });
        return;
      }

      res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch product',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // GET /api/categories
  getCategories = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const categories = Object.values(ProductCategory);

      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch categories',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // POST /api/products
  createProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const productData: CreateProductRequest = req.body;

      // Check if SKU already exists
      if (productData.sku) {
        const existingProduct = await prisma.product.findFirst({
          where: {
            sku: productData.sku,
            clinicId: req.user?.clinicId,
          },
        });

        if (existingProduct) {
          res.status(400).json({
            success: false,
            message: 'Product with this SKU already exists',
          });
          return;
        }
      }

      const product = await prisma.product.create({
        data: {
          ...productData,
          clinicId: req.user!.clinicId!,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: product,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create product',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // PUT /api/products/:id
  updateProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData: UpdateProductRequest = req.body;

      // Check if product exists and belongs to clinic
      const existingProduct = await prisma.product.findFirst({
        where: {
          id,
          clinicId: req.user?.clinicId,
        },
      });

      if (!existingProduct) {
        res.status(404).json({
          success: false,
          message: 'Product not found',
        });
        return;
      }

      // Check SKU conflict if updating SKU
      if (updateData.sku && updateData.sku !== existingProduct.sku) {
        const skuConflict = await prisma.product.findFirst({
          where: {
            sku: updateData.sku,
            clinicId: req.user?.clinicId,
            id: { not: id },
          },
        });

        if (skuConflict) {
          res.status(400).json({
            success: false,
            message: 'Product with this SKU already exists',
          });
          return;
        }
      }

      const product = await prisma.product.update({
        where: { id },
        data: updateData,
      });

      res.json({
        success: true,
        message: 'Product updated successfully',
        data: product,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update product',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // DELETE /api/products/:id
  deleteProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const existingProduct = await prisma.product.findFirst({
        where: {
          id,
          clinicId: req.user?.clinicId,
        },
      });

      if (!existingProduct) {
        res.status(404).json({
          success: false,
          message: 'Product not found',
        });
        return;
      }

      await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });

      res.json({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete product',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

export const productController = new ProductController();
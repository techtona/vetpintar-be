import { z } from 'zod';

// Create Product
export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  category: z.enum(['MEDICINE', 'FOOD', 'ACCESSORY', 'SERVICE', 'VACCINE', 'CONSUMABLE']),
  unit: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  stockQuantity: z.number().int().nonnegative().default(0),
  minStockAlert: z.number().int().nonnegative().default(10),
  expiryDate: z.coerce.date().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  photoUrl: z.string().url().optional()
});

export type CreateProductDto = z.infer<typeof createProductSchema>;

// Update Product
export const updateProductSchema = createProductSchema.partial().extend({
  isActive: z.boolean().optional()
});

export type UpdateProductDto = z.infer<typeof updateProductSchema>;

// Query
export const productQuerySchema = z.object({
  category: z.enum(['MEDICINE', 'FOOD', 'ACCESSORY', 'SERVICE', 'VACCINE', 'CONSUMABLE']).optional(),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  lowStock: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional()
});

export type ProductQueryDto = z.infer<typeof productQuerySchema>;

import { z } from 'zod';

// Invoice Item
const invoiceItemSchema = z.object({
  productId: z.string().uuid().optional(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().int().positive('Quantity must be positive'),
  unitPrice: z.number().nonnegative('Unit price must be non-negative'),
  discountPercent: z.number().min(0).max(100).default(0),
  totalPrice: z.number().nonnegative()
});

// Create Invoice
export const createInvoiceSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
  ownerId: z.string().uuid('Invalid owner ID'),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date().optional(),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
  subtotal: z.number().nonnegative(),
  taxAmount: z.number().nonnegative().default(0),
  discountAmount: z.number().nonnegative().default(0),
  totalAmount: z.number().nonnegative(),
  notes: z.string().optional()
});

export type CreateInvoiceDto = z.infer<typeof createInvoiceSchema>;

// Update Invoice Status
export const updateInvoiceStatusSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED'])
});

export type UpdateInvoiceStatusDto = z.infer<typeof updateInvoiceStatusSchema>;

// Add Payment
export const addPaymentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  paymentMethod: z.enum(['CASH', 'TRANSFER', 'CREDIT_CARD', 'E_WALLET', 'XENDIT']),
  paymentDate: z.coerce.date(),
  transactionId: z.string().optional(),
  notes: z.string().optional()
});

export type AddPaymentDto = z.infer<typeof addPaymentSchema>;

// Query
export const invoiceQuerySchema = z.object({
  patientId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED']).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional()
});

export type InvoiceQueryDto = z.infer<typeof invoiceQuerySchema>;

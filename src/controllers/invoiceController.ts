import { Response } from 'express';
import { AuthenticatedRequest, PaginationParams } from '../types';
import { prisma } from '../utils/database';
import { InvoiceStatus, PaymentMethod } from "@prisma/client";

interface CreateInvoiceRequest {
  patientId: string;
  ownerId: string;
  issueDate: Date;
  dueDate?: Date;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    discountPercent?: number;
    productId?: string;
  }>;
  notes?: string;
}

class InvoiceController {
  // GET /api/invoices
  getAllInvoices = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { page = 1, limit = 10, status, patientId, search } = req.query as PaginationParams & {
        status?: InvoiceStatus;
        patientId?: string;
        search?: string;
      };

      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {
        clinicId: req.user?.clinicId,
      };

      if (status) where.status = status;
      if (patientId) where.patientId = patientId;

      if (search) {
        where.OR = [
          { invoiceNumber: { contains: search, mode: 'insensitive' } },
          { patient: { name: { contains: search, mode: 'insensitive' } } },
          { owner: { name: { contains: search, mode: 'insensitive' } } },
        ];
      }

      const [invoices, total] = await Promise.all([
        prisma.invoice.findMany({
          where,
          include: {
            patient: {
              select: {
                id: true,
                name: true,
                species: true,
              },
            },
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            items: true,
            payments: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit),
        }),
        prisma.invoice.count({ where }),
      ]);

      res.json({
        success: true,
        data: invoices,
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
        message: 'Failed to fetch invoices',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // GET /api/invoices/:id
  getInvoiceById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const invoice = await prisma.invoice.findFirst({
        where: {
          id,
          clinicId: req.user?.clinicId,
        },
        include: {
          patient: true,
          owner: true,
          items: {
            include: {
              product: true,
            },
          },
          payments: true,
        },
      });

      if (!invoice) {
        res.status(404).json({
          success: false,
          message: 'Invoice not found',
        });
        return;
      }

      res.json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch invoice',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // POST /api/invoices
  createInvoice = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const invoiceData: CreateInvoiceRequest = req.body;

      // Generate invoice number
      const invoiceCount = await prisma.invoice.count({
        where: {
          clinicId: req.user?.clinicId,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      });

      const invoiceNumber = `INV-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${String(invoiceCount + 1).padStart(4, '0')}`;

      // Calculate totals
      let subtotal = 0;
      const items = invoiceData.items.map(item => {
        const totalPrice = item.quantity * item.unitPrice * (1 - (item.discountPercent || 0) / 100);
        subtotal += totalPrice;
        return {
          ...item,
          totalPrice,
        };
      });

      const taxAmount = subtotal * 0.11; // 11% tax
      const totalAmount = subtotal + taxAmount;

      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber,
          clinicId: req.user!.clinicId!,
          patientId: invoiceData.patientId,
          ownerId: invoiceData.ownerId,
          issueDate: invoiceData.issueDate,
          dueDate: invoiceData.dueDate,
          subtotal,
          taxAmount,
          totalAmount,
          notes: invoiceData.notes,
          status: InvoiceStatus.DRAFT,
          items: {
            create: items,
          },
        },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              species: true,
            },
          },
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: true,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Invoice created successfully',
        data: invoice,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create invoice',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // PUT /api/invoices/:id/status
  updateInvoiceStatus = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status, paymentMethod } = req.body;

      const invoice = await prisma.invoice.update({
        where: { id },
        data: {
          status,
          paymentMethod,
        },
      });

      res.json({
        success: true,
        message: 'Invoice status updated successfully',
        data: invoice,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update invoice status',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // POST /api/invoices/:id/payments
  addPayment = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { amount, paymentMethod, notes } = req.body;

      const payment = await prisma.payment.create({
        data: {
          invoiceId: id,
          amount,
          paymentMethod,
          paymentDate: new Date(),
          notes,
          status: 'SUCCESS',
        },
      });

      // Update invoice status if fully paid
      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
          payments: true,
        },
      });

      if (invoice) {
        const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
        if (totalPaid >= Number(invoice.totalAmount)) {
          await prisma.invoice.update({
            where: { id },
            data: { status: InvoiceStatus.PAID },
          });
        }
      }

      res.status(201).json({
        success: true,
        message: 'Payment added successfully',
        data: payment,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to add payment',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

export const invoiceController = new InvoiceController();
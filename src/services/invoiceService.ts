import { PrismaClient, Invoice, InvoiceStatus, PaymentMethod, PaymentStatus } from '../generated/prisma/index';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { prisma } from '../utils/database';
import { io } from '../index';

interface CreateInvoiceData {
  patientId: string;
  clinicId: string;
  ownerId: string;
  issueDate: Date;
  dueDate?: Date;
  items: {
    productId?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    discountPercent?: number;
  }[];
  notes?: string;
  taxAmount?: number;
  discountAmount?: number;
}

interface UpdateInvoiceData {
  dueDate?: Date;
  status?: InvoiceStatus;
  notes?: string;
  taxAmount?: number;
  discountAmount?: number;
}

interface CreatePaymentData {
  invoiceId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionId?: string;
  notes?: string;
}

interface GetInvoicesQuery {
  page?: number;
  limit?: number;
  clinicId?: string;
  patientId?: string;
  ownerId?: string;
  status?: InvoiceStatus;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export class InvoiceService {
  private readonly prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  private generateInvoiceNumber(clinicId: string): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

    return `INV-${clinicId.slice(-4)}-${year}${month}-${random}`;
  }

  async createInvoice(data: CreateInvoiceData): Promise<Invoice> {
    try {
      // Verify patient and clinic access
      const patient = await this.prisma.patient.findFirst({
        where: {
          id: data.patientId,
          clinicId: data.clinicId,
          owner: { id: data.ownerId }
        },
        include: { owner: true }
      });

      if (!patient) {
        throw createError(404, 'Patient not found or access denied');
      }

      // Calculate totals
      let subtotal = 0;
      const items = data.items.map(item => {
        const totalPrice = item.quantity * item.unitPrice;
        const discountAmount = totalPrice * (item.discountPercent || 0) / 100;
        const finalPrice = totalPrice - discountAmount;
        subtotal += finalPrice;

        return {
          productId: item.productId || null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent || 0,
          totalPrice: finalPrice
        };
      });

      const taxAmount = data.taxAmount || 0;
      const discountAmount = data.discountAmount || 0;
      const totalAmount = subtotal + taxAmount - discountAmount;

      const invoice = await this.prisma.invoice.create({
        data: {
          clinicId: data.clinicId,
          patientId: data.patientId,
          ownerId: data.ownerId,
          invoiceNumber: this.generateInvoiceNumber(data.clinicId),
          issueDate: data.issueDate,
          dueDate: data.dueDate,
          subtotal,
          taxAmount,
          discountAmount,
          totalAmount,
          status: InvoiceStatus.DRAFT,
          notes: data.notes || null,
          items: {
            create: items
          }
        },
        include: {
          patient: {
            include: {
              owner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true
                }
              }
            }
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true
                }
              }
            }
          }
        }
      });

      // Emit real-time notification
      io.to(`clinic-${data.clinicId}`).emit('invoice-created', {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        patientName: patient.name,
        ownerName: patient.owner.name,
        totalAmount: invoice.totalAmount
      });

      logger.info(`Invoice created: ${invoice.id} for clinic: ${invoice.clinicId}`);
      return invoice;
    } catch (error) {
      logger.error('Error creating invoice:', error);
      throw error;
    }
  }

  async getInvoices(query: GetInvoicesQuery): Promise<{
    invoices: Invoice[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        page = 1,
        limit = 20,
        clinicId,
        patientId,
        ownerId,
        status,
        dateFrom,
        dateTo,
        search
      } = query;

      const skip = (page - 1) * limit;
      const where: any = {};

      if (clinicId) {
        where.clinicId = clinicId;
      }

      if (patientId) {
        where.patientId = patientId;
      }

      if (ownerId) {
        where.ownerId = ownerId;
      }

      if (status) {
        where.status = status;
      }

      if (dateFrom || dateTo) {
        where.issueDate = {};
        if (dateFrom) where.issueDate.gte = dateFrom;
        if (dateTo) where.issueDate.lte = dateTo;
      }

      if (search) {
        where.OR = [
          { invoiceNumber: { contains: search, mode: 'insensitive' } },
          { patient: { name: { contains: search, mode: 'insensitive' } } },
          { owner: { name: { contains: search, mode: 'insensitive' } } }
        ];
      }

      const [invoices, total] = await Promise.all([
        this.prisma.invoice.findMany({
          where,
          skip,
          take: limit,
          orderBy: { issueDate: 'desc' },
          include: {
            patient: {
              select: {
                id: true,
                name: true,
                species: true
              }
            },
            owner: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            payments: {
              orderBy: { paymentDate: 'desc' }
            },
            _count: {
              select: {
                items: true,
                payments: true
              }
            }
          }
        }),
        this.prisma.invoice.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        invoices,
        total,
        page,
        totalPages
      };
    } catch (error) {
      logger.error('Error fetching invoices:', error);
      throw error;
    }
  }

  async getInvoiceById(id: string, clinicId?: string): Promise<Invoice> {
    try {
      const where: any = { id };

      if (clinicId) {
        where.clinicId = clinicId;
      }

      const invoice = await this.prisma.invoice.findFirst({
        where,
        include: {
          patient: {
            include: {
              owner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true
                }
              }
            }
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  category: true
                }
              }
            }
          },
          payments: {
            orderBy: { paymentDate: 'desc' }
          }
        }
      });

      if (!invoice) {
        throw createError(404, 'Invoice not found');
      }

      return invoice;
    } catch (error) {
      logger.error('Error fetching invoice:', error);
      throw error;
    }
  }

  async updateInvoice(id: string, data: UpdateInvoiceData, clinicId?: string): Promise<Invoice> {
    try {
      const where: any = { id };

      if (clinicId) {
        where.clinicId = clinicId;
      }

      const existingInvoice = await this.prisma.invoice.findFirst({
        where
      });

      if (!existingInvoice) {
        throw createError(404, 'Invoice not found');
      }

      // Prevent modification if invoice is already paid
      if (existingInvoice.status === InvoiceStatus.PAID) {
        throw createError(400, 'Cannot modify a paid invoice');
      }

      const updatedInvoice = await this.prisma.invoice.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date()
        },
        include: {
          patient: {
            select: {
              id: true,
              name: true
            }
          },
          items: true
        }
      });

      // Emit real-time notification
      if (clinicId) {
        io.to(`clinic-${clinicId}`).emit('invoice-updated', {
          invoiceId: updatedInvoice.id,
          invoiceNumber: updatedInvoice.invoiceNumber,
          status: updatedInvoice.status
        });
      }

      logger.info(`Invoice updated: ${updatedInvoice.id}`);
      return updatedInvoice;
    } catch (error) {
      logger.error('Error updating invoice:', error);
      throw error;
    }
  }

  async createPayment(data: CreatePaymentData): Promise<any> {
    try {
      // Get invoice
      const invoice = await this.prisma.invoice.findUnique({
        where: { id: data.invoiceId },
        include: {
          payments: true
        }
      });

      if (!invoice) {
        throw createError(404, 'Invoice not found');
      }

      // Calculate paid amount
      const paidAmount = invoice.payments.reduce((sum, payment) => {
        return sum + (payment.status === PaymentStatus.SUCCESS ? payment.amount : 0);
      }, 0);

      const remainingAmount = invoice.totalAmount - paidAmount;

      if (data.amount > remainingAmount) {
        throw createError(400, 'Payment amount exceeds remaining balance');
      }

      const payment = await this.prisma.payment.create({
        data: {
          invoiceId: data.invoiceId,
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          transactionId: data.transactionId || null,
          status: PaymentStatus.SUCCESS,
          paymentDate: new Date(),
          notes: data.notes || null
        }
      });

      // Update invoice status if fully paid
      const newPaidAmount = paidAmount + data.amount;
      let newStatus = invoice.status;

      if (newPaidAmount >= invoice.totalAmount) {
        newStatus = InvoiceStatus.PAID;
      } else if (newPaidAmount > 0) {
        newStatus = InvoiceStatus.PARTIAL;
      }

      if (newStatus !== invoice.status) {
        await this.prisma.invoice.update({
          where: { id: data.invoiceId },
          data: { status: newStatus }
        });
      }

      const updatedInvoice = await this.prisma.invoice.findUnique({
        where: { id: data.invoiceId },
        include: {
          patient: {
            select: {
              id: true,
              name: true
            }
          },
          payments: true
        }
      });

      // Emit real-time notification
      io.to(`clinic-${invoice.clinicId}`).emit('payment-received', {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        paymentAmount: data.amount,
        remainingBalance: invoice.totalAmount - newPaidAmount,
        status: newStatus
      });

      logger.info(`Payment created: ${payment.id} for invoice: ${data.invoiceId}`);
      return { payment, invoice: updatedInvoice };
    } catch (error) {
      logger.error('Error creating payment:', error);
      throw error;
    }
  }

  async deleteInvoice(id: string, clinicId?: string): Promise<void> {
    try {
      const where: any = { id };

      if (clinicId) {
        where.clinicId = clinicId;
      }

      const invoice = await this.prisma.invoice.findFirst({
        where,
        include: {
          _count: {
            select: {
              payments: true
            }
          }
        }
      });

      if (!invoice) {
        throw createError(404, 'Invoice not found');
      }

      // Prevent deletion if there are payments
      if (invoice._count.payments > 0) {
        // Soft delete by changing status
        await this.prisma.invoice.update({
          where: { id },
          data: {
            status: InvoiceStatus.CANCELLED,
            updatedAt: new Date()
          }
        });

        logger.info(`Invoice cancelled: ${id}`);
      } else {
        // Hard delete if no payments
        await this.prisma.invoice.delete({
          where: { id }
        });

        logger.info(`Invoice deleted: ${id}`);
      }
    } catch (error) {
      logger.error('Error deleting invoice:', error);
      throw error;
    }
  }

  async getInvoiceStats(clinicId: string, dateFrom?: Date, dateTo?: Date): Promise<{
    totalInvoices: number;
    totalRevenue: number;
    paidInvoices: number;
    unpaidInvoices: number;
    overdueInvoices: number;
    averageInvoiceAmount: number;
    monthlyRevenue?: number;
  }> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const dateFilter: any = {};
      if (dateFrom) dateFilter.gte = dateFrom;
      if (dateTo) dateFilter.lte = dateTo;

      const [
        totalInvoices,
        paidInvoices,
        unpaidInvoices,
        overdueInvoices,
        revenueData,
        monthlyRevenueData,
        totalAmountData
      ] = await Promise.all([
        this.prisma.invoice.count({
          where: { clinicId, issueDate: dateFilter }
        }),
        this.prisma.invoice.count({
          where: { clinicId, status: InvoiceStatus.PAID, issueDate: dateFilter }
        }),
        this.prisma.invoice.count({
          where: { clinicId, status: InvoiceStatus.SENT, issueDate: dateFilter }
        }),
        this.prisma.invoice.count({
          where: {
            clinicId,
            status: InvoiceStatus.SENT,
            dueDate: { lt: now },
            issueDate: dateFilter
          }
        }),
        this.prisma.invoice.aggregate({
          where: {
            clinicId,
            status: InvoiceStatus.PAID,
            issueDate: dateFilter
          },
          _sum: { totalAmount: true }
        }),
        this.prisma.invoice.aggregate({
          where: {
            clinicId,
            status: InvoiceStatus.PAID,
            issueDate: { gte: startOfMonth }
          },
          _sum: { totalAmount: true }
        }),
        this.prisma.invoice.aggregate({
          where: { clinicId, issueDate: dateFilter },
          _avg: { totalAmount: true }
        })
      ]);

      const totalRevenue = revenueData._sum.totalAmount || 0;
      const monthlyRevenue = monthlyRevenueData._sum.totalAmount || 0;
      const averageInvoiceAmount = totalAmountData._avg.totalAmount || 0;

      return {
        totalInvoices,
        totalRevenue,
        paidInvoices,
        unpaidInvoices,
        overdueInvoices,
        averageInvoiceAmount,
        monthlyRevenue
      };
    } catch (error) {
      logger.error('Error fetching invoice stats:', error);
      throw error;
    }
  }
}

export const invoiceService = new InvoiceService();
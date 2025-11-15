import { Router } from 'express';
import { invoiceController } from '../controllers/invoiceController';
import { authenticateToken } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/zodValidation';
import {
  createInvoiceSchema,
  updateInvoiceStatusSchema,
  addPaymentSchema,
  invoiceQuerySchema
} from '../dtos/invoice.dto';

const router = Router();

// Apply authentication to all invoice routes
router.use(authenticateToken);

router.get('/', validateQuery(invoiceQuerySchema), invoiceController.getAllInvoices);
router.get('/:id', invoiceController.getInvoiceById);
router.post('/', validateBody(createInvoiceSchema), invoiceController.createInvoice);
router.put('/:id/status', validateBody(updateInvoiceStatusSchema), invoiceController.updateInvoiceStatus);
router.post('/:id/payments', validateBody(addPaymentSchema), invoiceController.addPayment);

export { router as invoiceRoutes };

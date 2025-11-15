import { Router } from 'express';
import { invoiceController } from '../../controllers/invoiceController';
import { authenticateToken } from '../../middleware/auth';

const router = Router();

// Apply authentication to all invoice routes
router.use(authenticateToken);

router.get('/', invoiceController.getAllInvoices);
router.get('/:id', invoiceController.getInvoiceById);
router.post('/', invoiceController.createInvoice);
router.put('/:id/status', invoiceController.updateInvoiceStatus);
router.post('/:id/payments', invoiceController.addPayment);

export { router as invoiceRoutes };
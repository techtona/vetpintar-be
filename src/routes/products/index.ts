import { Router } from 'express';
import { productController } from '../../controllers/productController';
import { authenticateToken } from '../../middleware/auth';

const router = Router();

// Apply authentication to all product routes
router.use(authenticateToken);

router.get('/', productController.getAllProducts);
router.get('/categories', productController.getCategories);
router.get('/:id', productController.getProductById);
router.post('/', productController.createProduct);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

export { router as productRoutes };
import { Router } from 'express';
import { productController } from '../controllers/productController';
import { authenticateToken } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/zodValidation';
import { createProductSchema, updateProductSchema, productQuerySchema } from '../dtos/product.dto';

const router = Router();

// Apply authentication to all product routes
router.use(authenticateToken);

router.get('/', validateQuery(productQuerySchema), productController.getAllProducts);
router.get('/categories', productController.getCategories);
router.get('/:id', productController.getProductById);
router.post('/', validateBody(createProductSchema), productController.createProduct);
router.put('/:id', validateBody(updateProductSchema), productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

export { router as productRoutes };

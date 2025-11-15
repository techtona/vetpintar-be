import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/zodValidation';
import { ZodSchema } from 'zod';

export interface RouteConfig {
  controller: any;
  schemas?: {
    create?: ZodSchema;
    update?: ZodSchema;
    query?: ZodSchema;
  };
  requireAuth?: boolean;
  publicRoutes?: string[];
  customRoutes?: (router: Router) => void;
}

export function createRouter(config: RouteConfig): Router {
  const router = Router();
  const {
    controller,
    schemas,
    requireAuth = true,
    publicRoutes = [],
    customRoutes,
  } = config;

  // Public routes if specified
  if (publicRoutes.includes('getAll')) {
    router.get(
      '/',
      schemas?.query ? validateQuery(schemas.query) : (req, res, next) => next(),
      controller.getAll || controller.getAllItems
    );
  }

  if (publicRoutes.includes('getById')) {
    router.get('/:id', controller.getById || controller.getItemById);
  }

  // Apply authentication if required
  if (requireAuth && publicRoutes.length > 0) {
    router.use(authenticateToken);
  } else if (requireAuth) {
    router.use(authenticateToken);
  }

  // Protected routes
  if (!publicRoutes.includes('getAll')) {
    router.get(
      '/',
      schemas?.query ? validateQuery(schemas.query) : (req, res, next) => next(),
      controller.getAll || controller.getAllItems
    );
  }

  if (!publicRoutes.includes('getById')) {
    router.get('/:id', controller.getById || controller.getItemById);
  }

  router.post(
    '/',
    schemas?.create ? validateBody(schemas.create) : (req, res, next) => next(),
    controller.create || controller.createItem
  );

  router.put(
    '/:id',
    schemas?.update ? validateBody(schemas.update) : (req, res, next) => next(),
    controller.update || controller.updateItem
  );

  router.delete('/:id', controller.delete || controller.deleteItem);

  // Custom routes
  if (customRoutes) {
    customRoutes(router);
  }

  return router;
}
import { Router } from 'express';
import Service from '../models/Service.js';
import { buildCrudRouter } from '../utils/crud.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Services
 *   description: Gestion des services
 */

/**
 * @openapi
 * /api/services:
 *   get:
 *     tags: [Services]
 *     summary: Lister les services
 *   post:
 *     tags: [Services]
 *     summary: Créer un service
 */
router.use('/', buildCrudRouter(Service, 'Service'));

export default router;

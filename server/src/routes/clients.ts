import { Router } from 'express';
import Client from '../models/Client.js';
import { buildCrudRouter } from '../utils/crud.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Clients
 *   description: Gestion des clients
 */

/**
 * @openapi
 * /api/clients:
 *   get:
 *     tags: [Clients]
 *     summary: Lister les clients
 *   post:
 *     tags: [Clients]
 *     summary: Créer un client
 */
router.use('/', buildCrudRouter(Client, 'Client'));

export default router;

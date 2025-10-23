import { Router } from 'express';
import User from '../models/User.js';
import { buildCrudRouter } from '../utils/crud.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Users
 *   description: Gestion des utilisateurs
 */

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Lister les utilisateurs
 *     responses:
 *       200:
 *         description: Liste d'utilisateurs
 *   post:
 *     tags: [Users]
 *     summary: Créer un utilisateur
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       201:
 *         description: Utilisateur créé
 */
router.use('/', buildCrudRouter(User, 'User'));

export default router;

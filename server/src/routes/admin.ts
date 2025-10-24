import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireRoles, requireAuth } from '../middlewares/auth.js';
import User from '../models/User.js';
import Client from '../models/Client.js';
import Mechanic from '../models/Mechanic.js';
import Service from '../models/Service.js';
import Complaint from '../models/Complaint.js';

const router = Router();

// Toutes les routes admin nécessitent d'abord l'authentification, puis le rôle ADMIN
router.use(requireAuth);
router.use(requireRoles('ADMIN'));

/**
 * @openapi
 * tags:
 *   name: Admin
 *   description: Fonctions administrateur
 */

/**
 * @openapi
 * /api/admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: Lister tous les utilisateurs (Admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Liste des utilisateurs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users: { type: array, items: { $ref: '#/components/schemas/User' } }
 */
router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const users = await User.find().select('-password').populate('invitedBy', 'firstName lastName');
    res.json({ users });
  })
);

/**
 * @openapi
 * /api/admin/users/{id}:
 *   patch:
 *     tags: [Admin]
 *     summary: Modifier un utilisateur (rôle, statut) (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role: { type: string, enum: ['CLIENT', 'MECANICIEN', 'ADMIN'] }
 *               status: { type: string, enum: ['active', 'inactive', 'pending'] }
 *     responses:
 *       200:
 *         description: Utilisateur mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/User' }
 */
router.patch(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { role, status } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { role, status },
      { new: true }
    ).select('-password');
    if (!updatedUser) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    res.json({ user: updatedUser });
  })
);

/**
 * @openapi
 * /api/admin/clients:
 *   get:
 *     tags: [Admin]
 *     summary: Lister tous les clients (Admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Liste des clients
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 clients: { type: array, items: { $ref: '#/components/schemas/Client' } }
 */
router.get(
  '/clients',
  asyncHandler(async (req, res) => {
    const clients = await Client.find().populate('user', 'firstName lastName email');
    res.json({ clients });
  })
);

/**
 * @openapi
 * /api/admin/mechanics:
 *   get:
 *     tags: [Admin]
 *     summary: Lister tous les mécaniciens (Admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Liste des mécaniciens
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mechanics: { type: array, items: { $ref: '#/components/schemas/Mechanic' } }
 */
router.get(
  '/mechanics',
  asyncHandler(async (req, res) => {
    const mechanics = await Mechanic.find().populate('user', 'firstName lastName email');
    res.json({ mechanics });
  })
);

/**
 * @openapi
 * /api/admin/stats:
 *   get:
 *     tags: [Admin]
 *     summary: Statistiques générales (Admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Statistiques
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalUsers: { type: number }
 *                 totalClients: { type: number }
 *                 totalMechanics: { type: number }
 *                 activeUsers: { type: number }
 *                 totalServices: { type: number }
 *                 totalReports: { type: number }
 */
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const totalUsers = await User.countDocuments();
    // Compter par rôle directement dans la table Users
    const totalClients = await User.countDocuments({ role: 'CLIENT' });
    const totalMechanics = await User.countDocuments({ role: 'MECANICIEN' });
    const activeUsers = await User.countDocuments({ status: 'active' });
    const totalServices = await Service.countDocuments();
    const totalReports = await Complaint.countDocuments();
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.json({ totalUsers, totalClients, totalMechanics, activeUsers, totalServices, totalReports });
  })
);

export default router;

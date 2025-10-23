import { Router } from 'express';
import { 
  createAd, 
  updateAd, 
  getAds, 
  getAdById, 
  deleteAd, 
  getAdminAds 
} from '../controllers/adController.js';
import { requireAuth, requireRoles } from '../middlewares/auth.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Ads
 *   description: Gestion des publicités et annonces
 */

/**
 * @openapi
 * /api/ads:
 *   get:
 *     tags: [Ads]
 *     summary: Récupérer les annonces publiées
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Liste des annonces publiées
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: number
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Ad'
 */
router.get('/', requireAuth, getAds);

/**
 * @openapi
 * /api/ads/admin:
 *   get:
 *     tags: [Ads]
 *     summary: Récupérer toutes les annonces (admin seulement)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Liste de toutes les annonces
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: number
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Ad'
 */
router.get('/admin', requireAuth, requireRoles('ADMIN'), getAdminAds);

/**
 * @openapi
 * /api/ads/{id}:
 *   get:
 *     tags: [Ads]
 *     summary: Récupérer une annonce par son ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Détails de l'annonce
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Ad'
 */
router.get('/:id', requireAuth, getAdById);

/**
 * @openapi
 * /api/ads:
 *   post:
 *     tags: [Ads]
 *     summary: Créer une nouvelle annonce (admin seulement)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdInput'
 *     responses:
 *       201:
 *         description: Annonce créée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Ad'
 */
router.post('/', requireAuth, requireRoles('ADMIN'), createAd);

/**
 * @openapi
 * /api/ads/{id}:
 *   put:
 *     tags: [Ads]
 *     summary: Mettre à jour une annonce (admin seulement)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdInput'
 *     responses:
 *       200:
 *         description: Annonce mise à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Ad'
 */
router.put('/:id', requireAuth, requireRoles('ADMIN'), updateAd);

/**
 * @openapi
 * /api/ads/{id}:
 *   delete:
 *     tags: [Ads]
 *     summary: Supprimer une annonce (admin seulement)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Annonce supprimée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 */
router.delete('/:id', requireAuth, requireRoles('ADMIN'), deleteAd);

export default router;

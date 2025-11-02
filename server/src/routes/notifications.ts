import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import * as notificationController from '../controllers/notificationController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// Protéger toutes les routes avec l'authentification
router.use(requireAuth);

/**
 * @openapi
 * tags:
 *   name: Notifications
 *   description: Gestion des notifications utilisateur
 */

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Récupérer les notifications de l'utilisateur
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Numéro de la page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Nombre d'éléments par page
 *     responses:
 *       200:
 *         description: Liste des notifications
 */
router.get('/', asyncHandler(notificationController.getNotifications));

/**
 * @openapi
 * /api/notifications/unread/count:
 *   get:
 *     tags: [Notifications]
 *     summary: Récupérer le nombre de notifications non lues
 *     responses:
 *       200:
 *         description: Nombre de notifications non lues
 */
router.get('/unread/count', asyncHandler(notificationController.getUnreadCount));

/**
 * @openapi
 * /api/notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Marquer une notification comme lue
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la notification
 *     responses:
 *       200:
 *         description: Notification marquée comme lue
 *       404:
 *         description: Notification non trouvée
 */
router.patch('/:id/read', asyncHandler(notificationController.markAsRead));

/**
 * @openapi
 * /api/notifications/{id}:
 *   delete:
 *     tags: [Notifications]
 *     summary: Supprimer une notification
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la notification
 *     responses:
 *       200:
 *         description: Notification supprimée
 *       404:
 *         description: Notification non trouvée
 */
router.delete('/:id', asyncHandler(notificationController.deleteNotification));

/**
 * @openapi
 * /api/notifications/read-all:
 *   patch:
 *     tags: [Notifications]
 *     summary: Marquer toutes les notifications comme lues
 *     responses:
 *       200:
 *         description: Toutes les notifications ont été marquées comme lues
 */
router.patch('/read-all', asyncHandler(notificationController.markAllAsRead));

export default router;

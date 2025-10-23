import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import * as messageController from '../controllers/messageController.js';

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(requireAuth);

/**
 * @openapi
 * tags:
 *   name: Messages
 *   description: Gestion des messages et conversations
 */

/**
 * @openapi
 * /api/messages/conversations:
 *   get:
 *     tags: [Messages]
 *     summary: Récupérer les conversations de l'utilisateur
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Liste des conversations
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
 *                     $ref: '#/components/schemas/Conversation'
 */
router.get('/conversations', messageController.getConversations);

/**
 * @openapi
 * /api/messages/conversations:
 *   post:
 *     tags: [Messages]
 *     summary: Démarrer une nouvelle conversation (avec message initial optionnel)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - participantId
 *             properties:
 *               participantId:
 *                 type: string
 *                 example: "5f8d0f3d7a1b9c2e4f6g7h8"
 *                 description: ID de l'utilisateur avec qui démarrer la conversation
 *               content:
 *                 type: string
 *                 example: "Bonjour, comment allez-vous ?"
 *                 description: Message initial optionnel pour démarrer la conversation
 *               messageType:
 *                 type: string
 *                 enum: [text, image, file]
 *                 default: text
 *                 example: "text"
 *                 description: Type du message optionnel, valeur par defaut text
 *               fileUrl:
 *                 type: string
 *                 example: "https://example.com/image.jpg"
 *                 description: URL du fichier si messageType est 'image' ou 'file'
 *               fileName:
 *                 type: string
 *                 example: "photo.jpg"
 *                 description: Nom du fichier si messageType est 'image' ou 'file'
 *     responses:
 *       201:
 *         description: Conversation créée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Conversation'
 *                 initialMessage:
 *                   $ref: '#/components/schemas/Message'
 *                   description: Message initial si fourni dans la requête
 *       400:
 *         description: Erreur de validation (conversation avec soi-même, etc.)
 *       404:
 *         description: Utilisateur participant non trouvé
 */
router.post('/conversations', messageController.startConversation);

/**
 * @openapi
 * /api/messages/conversations/{conversationId}/messages:
 *   get:
 *     tags: [Messages]
 *     summary: Récupérer les messages d'une conversation
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Liste des messages
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
 *                     $ref: '#/components/schemas/Message'
 */
router.get('/conversations/:conversationId/messages', messageController.getMessages);

/**
 * @openapi
 * /api/messages/conversations/{conversationId}:
 *   delete:
 *     tags: [Messages]
 *     summary: Supprimer une conversation
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation supprimée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
router.delete('/conversations/:conversationId', messageController.deleteConversation);

/**
 * @openapi
 * /api/messages/unread-count:
 *   get:
 *     tags: [Messages]
 *     summary: Récupérer le nombre total de messages non lus
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Nombre de messages non lus
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalUnread:
 *                       type: number
 */
router.get('/unread-count', messageController.getUnreadCount);

export default router;

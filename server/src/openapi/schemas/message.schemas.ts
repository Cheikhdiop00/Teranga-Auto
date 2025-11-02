/**
 * @openapi
 * components:
 *   schemas:
 *     Message:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "5f8d0f3d7a1b9c2e4f6g7h8"
 *         conversation:
 *           type: string
 *           example: "5f8d0f3d7a1b9c2e4f6g7h8"
 *         sender:
 *           $ref: '#/components/schemas/User'
 *         content:
 *           type: string
 *           example: "Bonjour, comment allez-vous ?"
 *         read:
 *           type: boolean
 *           example: false
 *         readAt:
 *           type: string
 *           format: date-time
 *           example: "2025-01-01T12:00:00.000Z"
 *         messageType:
 *           type: string
 *           enum: [text, image, file, audio]
 *           example: "text"
 *         fileUrl:
 *           type: string
 *           example: "https://example.com/file.pdf"
 *         fileName:
 *           type: string
 *           example: "document.pdf"
 *         audioDurationMs:
 *           type: number
 *           example: 4200
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     Conversation:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "5f8d0f3d7a1b9c2e4f6g7h8"
 *         participants:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/User'
 *         lastMessage:
 *           $ref: '#/components/schemas/Message'
 *         isActive:
 *           type: boolean
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         unreadCount:
 *           type: number
 *           example: 3
 */

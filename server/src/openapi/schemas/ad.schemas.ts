/**
 * @openapi
 * components:
 *   schemas:
 *     Ad:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 5f8d0f3d7a1b9c2e4f6g7h8
 *         title:
 *           type: string
 *           example: "Promotion spéciale"
 *         description:
 *           type: string
 *           example: "Réduction de 20% sur tous les services"
 *         imageUrl:
 *           type: string
 *           example: "https://example.com/promotion.jpg"
 *         category:
 *           type: string
 *           enum: [PROMOTION, INFORMATION, MAINTENANCE, AUTRE]
 *           example: "PROMOTION"
 *         startDate:
 *           type: string
 *           format: date-time
 *           example: "2025-01-01T00:00:00.000Z"
 *         endDate:
 *           type: string
 *           format: date-time
 *           example: "2025-12-31T23:59:59.000Z"
 *         isPublished:
 *           type: boolean
 *           example: true
 *         publishedBy:
 *           $ref: '#/components/schemas/User'
 *         targetRoles:
 *           type: array
 *           items:
 *             type: string
 *             enum: [CLIENT, MECANICIEN, ALL]
 *             example: ["ALL"]
 *         priority:
 *           type: number
 *           minimum: 1
 *           maximum: 10
 *           example: 5
 *         active:
 *           type: boolean
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     AdInput:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - imageUrl
 *       properties:
 *         title:
 *           type: string
 *           example: "Promotion spéciale"
 *         description:
 *           type: string
 *           example: "Réduction de 20% sur tous les services"
 *         imageUrl:
 *           type: string
 *           example: "https://example.com/promotion.jpg"
 *         category:
 *           type: string
 *           enum: [PROMOTION, INFORMATION, MAINTENANCE, AUTRE]
 *           default: "INFORMATION"
 *           example: "PROMOTION"
 *         startDate:
 *           type: string
 *           format: date-time
 *           example: "2025-01-01T00:00:00.000Z"
 *         endDate:
 *           type: string
 *           format: date-time
 *           example: "2025-12-31T23:59:59.000Z"
 *         targetRoles:
 *           type: array
 *           items:
 *             type: string
 *             enum: [CLIENT, MECANICIEN, ALL]
 *           default: ["ALL"]
 *         priority:
 *           type: number
 *           minimum: 1
 *           maximum: 10
 *           default: 5
 *
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 5f8d0f3d7a1b9c2e4f6g7h8
 *         firstName:
 *           type: string
 *           example: "John"
 *         lastName:
 *           type: string
 *           example: "Doe"
 *         email:
 *           type: string
 *           format: email
 *           example: "john.doe@example.com"
 *         role:
 *           type: string
 *           enum: [ADMIN, CLIENT, MECANICIEN]
 *           example: "ADMIN"
 */

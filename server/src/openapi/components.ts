/**
 * @openapi
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         firstName: { type: string }
 *         lastName: { type: string }
 *         email: { type: string, format: email }
 *         password: { type: string }
 *         phoneNumber: { type: string }
 *         profilePhoto: { type: string }
 *         status:
 *           type: string
 *           enum: [active, inactive]
 *         role:
 *           type: string
 *           enum: [ADMIN, CLIENT, MECANICIEN]
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *
 *     Client:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         user: { type: string, description: 'User ID' }
 *         nationalId: { type: string }
 *         address: { type: string }
 *         latitude: { type: number }
 *         longitude: { type: number }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *
 *     Mechanic:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         user: { type: string, description: 'User ID' }
 *         specialty: { type: string }
 *         interventionZone: { type: string }
 *         available: { type: boolean }
 *         reputation: { type: number, minimum: 0, maximum: 5 }
 *         missionStatus:
 *           type: string
 *           enum: [idle, on_mission, unavailable]
 *         interventionsCount: { type: number }
 *         address: { type: string }
 *         latitude: { type: number }
 *         longitude: { type: number }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *
 *     Service:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         name: { type: string }
 *         description: { type: string }
 *         basePrice: { type: number }
 *         scoreAverage: { type: number, minimum: 0, maximum: 5 }
 *         active: { type: boolean }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *
 *     Breakdown:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         client: { type: string, description: 'Client ID' }
 *         mechanic: { type: string, description: 'Mechanic ID' }
 *         description: { type: string }
 *         latitude: { type: number }
 *         longitude: { type: number }
 *         reportedAt: { type: string, format: date-time }
 *         status:
 *           type: string
 *           enum: [open, in_progress, closed]
 *         closedAt: { type: string, format: date-time }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *
 *     Message:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         sender: { type: string, description: 'User ID' }
 *         receiver: { type: string, description: 'User ID' }
 *         content: { type: string }
 *         read: { type: boolean }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *
 *     Notification:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         user: { type: string, description: 'User ID' }
 *         title: { type: string }
 *         content: { type: string }
 *         type: { type: string }
 *         read: { type: boolean }
 *         sentAt: { type: string, format: date-time }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *
 *     Review:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         client: { type: string, description: 'Client ID' }
 *         mechanic: { type: string, description: 'Mechanic ID' }
 *         breakdown: { type: string, description: 'Breakdown ID' }
 *         rating: { type: number, minimum: 1, maximum: 5 }
 *         comment: { type: string }
 *         date: { type: string, format: date-time }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *
 *     Complaint:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         user: { type: string, description: 'User ID' }
 *         breakdown: { type: string, description: 'Breakdown ID' }
 *         description: { type: string }
 *         status:
 *           type: string
 *           enum: [open, in_progress, resolved, rejected]
 *         adminResponse: { type: string }
 *         responseAt: { type: string, format: date-time }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *
 *     Advice:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         title: { type: string }
 *         content: { type: string }
 *         category: { type: string }
 *         author: { type: string, description: 'User ID' }
 *         publishedAt: { type: string, format: date-time }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *
 *     Ad:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         title: { type: string }
 *         description: { type: string }
 *         imageUrl: { type: string }
 *         category: { type: string }
 *         startAt: { type: string, format: date-time }
 *         estimatedDurationDays: { type: number }
 *         invoiceNumber: { type: string }
 *         active: { type: boolean }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *
 *     History:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         client: { type: string, description: 'Client ID' }
 *         mechanic: { type: string, description: 'Mechanic ID' }
 *         breakdown: { type: string, description: 'Breakdown ID' }
 *         requestDate: { type: string, format: date-time }
 *         interventionDate: { type: string, format: date-time }
 *         estimatedCost: { type: number }
 *         status:
 *           type: string
 *           enum: [pending, in_progress, completed, cancelled]
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 */

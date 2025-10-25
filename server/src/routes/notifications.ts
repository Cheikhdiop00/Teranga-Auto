import { Router } from 'express';
import Notification from '../models/Notification.js';
import { buildCrudRouter } from '../utils/crud.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import mongoose from 'mongoose';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Notifications
 *   description: Notifications utilisateur
 */

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter: Record<string, any> = {};
    const { userId, read } = req.query;

    if (userId && typeof userId === 'string' && mongoose.Types.ObjectId.isValid(userId)) {
      filter.user = userId;
    }

    if (read !== undefined) {
      if (read === 'true' || read === 'false') {
        filter.read = read === 'true';
      }
    }

    const notifications = await Notification.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ count: notifications.length, data: notifications });
  }),
);

router.use('/', buildCrudRouter(Notification, 'Notification'));

/**
 * @openapi
 * /api/notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Marquer une notification comme lue
 */
router.patch(
  '/:id/read',
  asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid notification ID' });
    }
    const doc = await Notification.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
    if (!doc) return res.status(404).json({ message: 'Notification not found' });
    res.json(doc);
  })
);

export default router;

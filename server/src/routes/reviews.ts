import { Router } from 'express';
import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Mechanic from '../models/Mechanic.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { crudHandlers } from '../utils/crud.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getIO } from '../socket.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Reviews
 *   description: Avis des clients sur les mécaniciens
 */

const handlers = crudHandlers(Review, 'Review');

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { client, mechanic, breakdown, rating, comment, date } = req.body || {};

    if (!client || !mechanic || !rating) {
      return res.status(400).json({ message: 'client, mechanic et rating sont requis.' });
    }

    const review = await Review.create({
      client,
      mechanic,
      breakdown,
      rating,
      comment,
      date: date ? new Date(date) : undefined,
    });

    const mechanicId = String(review.mechanic);
    const mechanicObjectId = new mongoose.Types.ObjectId(mechanicId);

    const [stats] = await Review.aggregate([
      { $match: { mechanic: mechanicObjectId } },
      { $group: { _id: '$mechanic', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);

    const average = Number(stats?.avg ?? 0);
    const count = Number(stats?.count ?? 0);

    const mechanicDoc = await Mechanic.findByIdAndUpdate(
      mechanicId,
      { reputation: average, interventionsCount: count },
      { new: true },
    )
      .populate({ path: 'user', select: 'firstName lastName _id' })
      .lean();

    const mechanicUserId = mechanicDoc?.user?._id || mechanicDoc?.user;

    if (mechanicUserId) {
      await Notification.create({
        user: mechanicUserId,
        title: 'Nouvel avis reçu',
        content: `Vous avez reçu une note de ${rating}/5${comment ? `: "${comment}"` : '.'}`,
        type: 'review',
      });

      const io = getIO();
      if (io) {
        io.to(`user_${mechanicUserId}`).emit('review_received', {
          review,
          stats: { average, count },
        });
      }
    }

    try {
      const admins = await User.find({ role: 'ADMIN' }).select('_id firstName lastName').lean();
      if (admins.length) {
        const notificationPayload = {
          title: 'Avis client enregistré',
          content: `Note ${rating}/5 pour le mécanicien ${mechanicDoc?.user?.firstName || ''} ${mechanicDoc?.user?.lastName || ''}`.trim(),
          type: 'review_admin',
          metadata: {
            reviewId: review._id,
            mechanicId,
            rating,
            comment,
          },
        } as const;

        const createdNotifications = await Promise.all(
          admins.map((admin) =>
            Notification.create({
              user: admin._id,
              ...notificationPayload,
            }),
          ),
        );

        const io = getIO();
        if (io) {
          admins.forEach((admin, index) => {
            io.to(`user_${admin._id}`).emit('admin_notification', {
              notification: createdNotifications[index],
            });
          });
        }
      }
    } catch (error) {
      console.error('Unable to notify admins about review', error);
    }

    res.status(201).json({
      review,
      mechanicStats: {
        average,
        count,
      },
    });
  }),
);

router.get('/', handlers.list);
router.get('/:id', handlers.get);
router.patch('/:id', handlers.update);
router.delete('/:id', handlers.remove);

/**
 * @openapi
 * /api/reviews/byMechanic/{mechanicId}:
 *   get:
 *     tags: [Reviews]
 *     summary: Lister les avis d'un mécanicien
 */
router.get(
  '/byMechanic/:mechanicId',
  asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.mechanicId)) {
      return res.status(400).json({ message: 'Invalid mechanic ID' });
    }
    const docs = await Review.find({ mechanic: req.params.mechanicId }).lean();
    res.json(docs);
  })
);

/**
 * @openapi
 * /api/reviews/average/mechanic/{mechanicId}:
 *   get:
 *     tags: [Reviews]
 *     summary: Note moyenne d'un mécanicien
 */
router.get(
  '/average/mechanic/:mechanicId',
  asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.mechanicId)) {
      return res.status(400).json({ message: 'Invalid mechanic ID' });
    }
    const mechanicId = new mongoose.Types.ObjectId(req.params.mechanicId);
    const [agg] = await Review.aggregate([
      { $match: { mechanic: mechanicId } },
      { $group: { _id: '$mechanic', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);
    res.json(agg || { avg: 0, count: 0 });
  })
);

export default router;

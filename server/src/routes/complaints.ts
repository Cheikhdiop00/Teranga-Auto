import { Router } from 'express';
import Complaint from '../models/Complaint.js';
import Breakdown from '../models/Breakdown.js';
import Mechanic from '../models/Mechanic.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { buildCrudRouter } from '../utils/crud.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getIO } from '../socket.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Complaints
 *   description: Réclamations
 */

// CRUD
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const complaint = await Complaint.create(req.body);

    try {
      const breakdownId = complaint.breakdown;
      if (breakdownId) {
        const breakdown = await Breakdown.findById(breakdownId).lean();
        const mechanicId = breakdown?.mechanic;
        if (mechanicId) {
          const mechanic = await Mechanic.findById(mechanicId).populate({ path: 'user', select: '_id firstName lastName' }).lean();
          const mechanicUserId = mechanic?.user?._id || mechanic?.user;
          if (mechanicUserId) {
            const notification = await Notification.create({
              user: mechanicUserId,
              title: 'Signalement client',
              content: complaint.description,
              type: 'complaint',
              metadata: {
                complaintId: complaint._id,
                breakdownId,
                clientId: complaint.user,
              },
            });

            const io = getIO();
            if (io) {
              io.to(`user_${mechanicUserId}`).emit('complaint_received', {
                complaint,
                notification,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Unable to notify mechanic about complaint', error);
    }

    try {
      const admins = await User.find({ role: 'ADMIN' }).select('_id firstName lastName').lean();
      if (admins.length) {
        const notificationPayload = {
          title: 'Signalement client',
          content: complaint.description,
          type: 'complaint_admin',
          metadata: {
            complaintId: complaint._id,
            breakdownId: complaint.breakdown,
            clientId: complaint.user,
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
      console.error('Unable to notify admins about complaint', error);
    }

    res.status(201).json(complaint);
  })
);

router.use('/', buildCrudRouter(Complaint, 'Complaint'));

/**
 * @openapi
 * /api/complaints/{id}/resolve:
 *   post:
 *     tags: [Complaints]
 *     summary: Marquer une réclamation comme résolue
 */
router.post(
  '/:id/resolve',
  asyncHandler(async (req, res) => {
    const doc = await Complaint.findByIdAndUpdate(
      req.params.id,
      { status: 'resolved', responseAt: new Date(), adminResponse: req.body?.adminResponse },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: 'Complaint not found' });
    res.json(doc);
  })
);

export default router;

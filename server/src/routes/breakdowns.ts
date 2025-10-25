import { Router, Request, Response, NextFunction } from 'express';
import Breakdown from '../models/Breakdown.js';
import { buildCrudRouter, crudHandlers } from '../utils/crud.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import Client from '../models/Client.js';
import User from '../models/User.js';
import Mechanic from '../models/Mechanic.js';
import Notification from '../models/Notification.js';
import { distanceKm } from '../utils/geo.js';
import { getIO } from '../socket.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Breakdowns
 *   description: Gestion des pannes
 */

const emitBreakdownCreated = async (breakdown: any) => {
  try {
    const io = getIO();
    if (!io) return;

    const populated = await Breakdown.findById(breakdown._id)
      .populate({ path: 'client', populate: { path: 'user', select: 'firstName lastName phoneNumber' } })
      .populate({ path: 'mechanic', populate: { path: 'user', select: 'firstName lastName phoneNumber' } })
      .lean();

    io.emit('breakdown_created', populated);

    if (populated?.latitude != null && populated?.longitude != null) {
      const mechanics = await Mechanic.find({ latitude: { $ne: null }, longitude: { $ne: null }, available: { $ne: false } })
        .populate({ path: 'user', select: 'firstName lastName phoneNumber pushToken' })
        .lean();

      mechanics.forEach((m: any) => {
        const d = distanceKm({ lat: populated.latitude, lng: populated.longitude }, { lat: m.latitude, lng: m.longitude });
        if (d <= 25) {
          io.to(`user_${m.user?._id || m.user}`).emit('breakdown_nearby', {
            breakdown: populated,
            distanceKm: d,
          });

          const pushToken = m.user?.pushToken;
          if (pushToken) {
            console.log('Push notification pending implementation for token:', pushToken);
          }
        }
      });
    }
  } catch (error) {
    console.error('Error emitting breakdown_created event:', error);
  }
};

const emitBreakdownAssigned = async (breakdownId: string) => {
  try {
    const io = getIO();
    if (!io) return;

    const populated = await Breakdown.findById(breakdownId)
      .populate({ path: 'client', populate: { path: 'user', select: 'firstName lastName phoneNumber profilePhoto' } })
      .populate({ path: 'mechanic', populate: { path: 'user', select: 'firstName lastName phoneNumber profilePhoto' } })
      .lean();

    if (!populated?.client || !populated?.mechanic) return;

    const clientUserId = populated.client?.user?._id || populated.client?.user;
    if (!clientUserId) return;

    const mechanicUserId = populated.mechanic?.user?._id || populated.mechanic?.user;
    const mechanicLat = populated.mechanic?.latitude;
    const mechanicLng = populated.mechanic?.longitude;
    const clientLat = populated.latitude;
    const clientLng = populated.longitude;

    let distance = null;
    let etaMinutes = null;
    if (
      typeof mechanicLat === 'number' &&
      typeof mechanicLng === 'number' &&
      typeof clientLat === 'number' &&
      typeof clientLng === 'number'
    ) {
      distance = distanceKm({ lat: mechanicLat, lng: mechanicLng }, { lat: clientLat, lng: clientLng });
      const avgSpeedKmH = 30;
      etaMinutes = Math.max(2, Math.round((distance / avgSpeedKmH) * 60));
    }

    await Notification.create({
      user: clientUserId,
      title: 'Mécanicien assigné',
      content: `Un mécanicien se rend vers vous: ${[populated.mechanic?.user?.firstName, populated.mechanic?.user?.lastName]
        .filter(Boolean)
        .join(' ') || 'Mécanicien'}.`,
      type: 'assignment',
    });

    io.to(`user_${clientUserId}`).emit('breakdown_assigned', {
      breakdown: populated,
      mechanic: populated.mechanic,
      client: populated.client,
      distanceKm: distance,
      etaMinutes,
    });
  } catch (error) {
    console.error('Error emitting breakdown_assigned event:', error);
  }
};

const breakdownHandlers = crudHandlers(Breakdown, 'Breakdown');

const createWithNotification = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const breakdown = await Breakdown.create(req.body);
    emitBreakdownCreated(breakdown);
    res.status(201).json(breakdown);
  } catch (error) {
    next(error);
  }
});

const breakdownRouter = Router();
breakdownRouter.post('/', createWithNotification);
breakdownRouter.get('/', breakdownHandlers.list);
breakdownRouter.get('/:id', breakdownHandlers.get);
breakdownRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body || {};

    const doc = await Breakdown.findByIdAndUpdate(id, updates, { new: true });
    if (!doc) return res.status(404).json({ message: 'Breakdown not found' });

    const assignedNow =
      (updates?.status === 'in_progress' || doc.status === 'in_progress') &&
      Boolean(updates?.mechanic || doc.mechanic);
    if (assignedNow) {
      emitBreakdownAssigned(String(doc._id));
    }

    res.json(doc);
  }),
);
breakdownRouter.delete('/:id', breakdownHandlers.remove);

router.use('/', breakdownRouter);

/**
 * @openapi
 * /api/breakdowns/nearby:
 *   get:
 *     tags: [Breakdowns]
 *     summary: Lister les pannes ouvertes proches d'une position
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: lng
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: radiusKm
 *         required: false
 *         schema: { type: number, default: 20 }
 */
router.get(
  '/nearby',
  asyncHandler(async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radiusKm = req.query.radiusKm ? Number(req.query.radiusKm) : 20;
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ message: 'lat & lng are required numeric query params' });
    }

    // Récupérer pannes ouvertes avec coordonnées
    const breakdowns = await Breakdown.find({ status: 'open', latitude: { $ne: null }, longitude: { $ne: null } })
      .lean();

    // Enrichir avec client et user
    const result: any[] = [];
    for (const b of breakdowns) {
      const d = distanceKm({ lat, lng }, { lat: b.latitude, lng: b.longitude });
      if (d > radiusKm) continue;
      let clientName = 'Client';
      try {
        const client = b.client ? await Client.findById(b.client).lean() : null;
        const user = client?.user ? await User.findById(client.user).lean() : null;
        if (user) clientName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || clientName;
      } catch {}
      const estimatedDurationMin = Math.max(2, Math.round((d / 30) * 60)); // ~30km/h par défaut
      result.push({
        id: String(b._id),
        clientName,
        description: b.description,
        latitude: b.latitude,
        longitude: b.longitude,
        distanceKm: Number(d.toFixed(2)),
        estimatedDurationMin,
        reportedAt: b.reportedAt,
        status: b.status,
      });
    }

    // Trier par distance
    result.sort((a, b) => a.distanceKm - b.distanceKm);
    res.json({ count: result.length, data: result });
  })
);

/**
 * @openapi
 * /api/breakdowns/byClient/{clientId}:
 *   get:
 *     tags: [Breakdowns]
 *     summary: Lister les pannes d'un client
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema: { type: string }
 */
router.get(
  '/byClient/:clientId',
  asyncHandler(async (req, res) => {
    const { clientId } = req.params;
    const docs = await Breakdown.find({ client: clientId }).lean();
    res.json(docs);
  })
);

/**
 * @openapi
 * /api/breakdowns/byMechanic/{mechanicId}:
 *   get:
 *     tags: [Breakdowns]
 *     summary: Lister les pannes d'un mécanicien
 *     parameters:
 *       - in: path
 *         name: mechanicId
 *         required: true
 *         schema: { type: string }
 */
router.get(
  '/byMechanic/:mechanicId',
  asyncHandler(async (req, res) => {
    const { mechanicId } = req.params;
    const docs = await Breakdown.find({ mechanic: mechanicId }).lean();
    res.json(docs);
  })
);

/**
 * @openapi
 * /api/breakdowns/{id}/assign/{mechanicId}:
 *   post:
 *     tags: [Breakdowns]
 *     summary: Assigner une panne à un mécanicien (statut in_progress)
 */
router.post(
  '/:id/assign/:mechanicId',
  asyncHandler(async (req, res) => {
    const { id, mechanicId } = req.params;
    const doc = await Breakdown.findByIdAndUpdate(
      id,
      { mechanic: mechanicId, status: 'in_progress' },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: 'Breakdown not found' });
    res.json(doc);
  })
);

/**
 * @openapi
 * /api/breakdowns/{id}/close:
 *   post:
 *     tags: [Breakdowns]
 *     summary: Clore une panne (statut closed)
 */
router.post(
  '/:id/close',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const doc = await Breakdown.findByIdAndUpdate(
      id,
      { status: 'closed', closedAt: new Date() },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: 'Breakdown not found' });
    res.json(doc);
  })
);

export default router;

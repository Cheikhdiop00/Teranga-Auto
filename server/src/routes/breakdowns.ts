import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
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

    if (typeof populated?.latitude === 'number' && typeof populated?.longitude === 'number') {
      const mechanics = await Mechanic.find({ latitude: { $ne: null }, longitude: { $ne: null }, available: { $ne: false } })
        .populate({ path: 'user', select: 'firstName lastName phoneNumber pushToken' })
        .lean();

      mechanics.forEach((m: any) => {
        const mechLat = typeof m?.latitude === 'number' ? m.latitude : null;
        const mechLng = typeof m?.longitude === 'number' ? m.longitude : null;
        if (mechLat == null || mechLng == null) return;

        const d = distanceKm({ lat: populated.latitude, lng: populated.longitude }, { lat: mechLat, lng: mechLng });
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

const emitBreakdownCompleted = async (breakdownId: string) => {
  try {
    const io = getIO();
    if (!io) return;

    const populated = await Breakdown.findById(breakdownId)
      .populate({
        path: 'client',
        populate: { path: 'user', select: 'firstName lastName phoneNumber profilePhoto' },
      })
      .populate({
        path: 'mechanic',
        populate: { path: 'user', select: 'firstName lastName phoneNumber profilePhoto pushToken' },
      })
      .lean();

    if (!populated) return;

    const mechanicDoc: any = populated.mechanic as any;
    const clientDoc: any = populated.client as any;
    const mechanicUserId = mechanicDoc?.user?._id || mechanicDoc?.user;
    const clientUserId = clientDoc?.user?._id || clientDoc?.user;

    const payload = {
      breakdown: populated,
    };

    if (mechanicUserId) {
      io.to(`user_${mechanicUserId}`).emit('breakdown_completed', payload);
    }
    if (clientUserId) {
      io.to(`user_${clientUserId}`).emit('breakdown_completed', payload);
    }
  } catch (error) {
    console.error('Error emitting breakdown_completed event:', error);
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

    const clientDoc: any = populated.client as any;
    const mechanicDoc: any = populated.mechanic as any;
    const clientUserId = clientDoc?.user?._id || clientDoc?.user;
    if (!clientUserId) return;

    const mechanicUserId = mechanicDoc?.user?._id || mechanicDoc?.user;
    const mechanicLat = typeof mechanicDoc?.latitude === 'number' ? mechanicDoc.latitude : null;
    const mechanicLng = typeof mechanicDoc?.longitude === 'number' ? mechanicDoc.longitude : null;
    const clientLat = populated.latitude;
    const clientLng = populated.longitude;

    let distance = null;
    let etaMinutes = null;
    if (mechanicLat != null && mechanicLng != null && typeof clientLat === 'number' && typeof clientLng === 'number') {
      distance = distanceKm({ lat: mechanicLat, lng: mechanicLng }, { lat: clientLat, lng: clientLng });
      const avgSpeedKmH = 30;
      etaMinutes = Math.max(2, Math.round((distance / avgSpeedKmH) * 60));
    }

    await Notification.create({
      user: clientUserId,
      title: 'Mécanicien assigné',
      content: `Un mécanicien se rend vers vous: ${
        [mechanicDoc?.user?.firstName, mechanicDoc?.user?.lastName].filter(Boolean).join(' ') || 'Mécanicien'
      }.`,
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

const normalizeServiceStatus = (status: string) => {
  if (status === 'open') return 'pending';
  if (status === 'closed') return 'completed';
  return status;
};

const makeFullName = (user: any) =>
  user ? [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined : undefined;

const syncBreakdownToService = async (breakdownId: string) => {
  try {
    const servicesCollection = mongoose.connection?.db?.collection('services');
    if (!servicesCollection) return;

    const populated = await Breakdown.findById(breakdownId)
      .populate({
        path: 'client',
        populate: { path: 'user', select: 'firstName lastName phoneNumber address' },
      })
      .populate({
        path: 'mechanic',
        populate: { path: 'user', select: 'firstName lastName phoneNumber latitude longitude' },
      })
      .lean();

    if (!populated) return;

    const existing = await servicesCollection.findOne({ _id: populated._id });
    const nowIso = new Date().toISOString();
    const normalizedStatus = normalizeServiceStatus(populated.status);

    const clientDocId = populated.client ? String((populated.client as any)._id || populated.client) : '';
    const mechanicDocId = populated.mechanic ? String((populated.mechanic as any)._id || populated.mechanic) : null;

    const clientUser = (populated.client as any)?.user;
    const mechanicUser = (populated.mechanic as any)?.user;

    const serviceTypeCandidate =
      (populated as any).serviceType ||
      (populated as any).service_type ||
      (populated as any).category ||
      (populated as any).type;

    const clientDoc: any = populated.client;
    const mechanicDoc: any = populated.mechanic;

    let locationAddress =
      (populated as any).locationAddress ||
      (populated as any).address ||
      existing?.location_address ||
      clientDoc?.address ||
      '';

    if (!locationAddress && typeof populated.latitude === 'number' && typeof populated.longitude === 'number') {
      locationAddress = `${populated.latitude.toFixed(4)}, ${populated.longitude.toFixed(4)}`;
    }

    const servicePayload: Record<string, any> = {
      client_id: clientDocId,
      mechanic_id: mechanicDocId,
      client_name: makeFullName(clientUser) || existing?.client_name,
      client_phone: clientUser?.phoneNumber || existing?.client_phone,
      mechanic_name: makeFullName(mechanicUser) || existing?.mechanic_name,
      mechanic_phone: mechanicUser?.phoneNumber || existing?.mechanic_phone,
      service_type:
        serviceTypeCandidate ||
        (populated.description ? `Assistance - ${populated.description.slice(0, 40)}` : undefined) ||
        existing?.service_type ||
        'Dépannage automobile',
      status: normalizedStatus,
      location_lat: populated.latitude ?? null,
      location_lng: populated.longitude ?? null,
      client_lat: populated.latitude ?? null,
      client_lng: populated.longitude ?? null,
      location_address: locationAddress,
      description: populated.description ?? existing?.description ?? '',
      distance_km: existing?.distance_km ?? null,
      estimated_time: existing?.estimated_time ?? null,
      updated_at: nowIso,
    };

    if (!servicePayload.client_name) {
      const client = populated.client as any;
      if (client) {
        servicePayload.client_name = makeFullName(client) || existing?.client_name;
      }
    }

    if (normalizedStatus === 'in_progress' || normalizedStatus === 'accepted') {
      servicePayload.accepted_at = existing?.accepted_at ?? nowIso;
      servicePayload.started_at = existing?.started_at ?? nowIso;
    }
    if (normalizedStatus === 'completed') {
      servicePayload.completed_at = existing?.completed_at ?? nowIso;
    }

    const mechanicLat = typeof mechanicDoc?.latitude === 'number' ? mechanicDoc.latitude : null;
    const mechanicLng = typeof mechanicDoc?.longitude === 'number' ? mechanicDoc.longitude : null;
    if (mechanicLat != null && mechanicLng != null && typeof populated.latitude === 'number' && typeof populated.longitude === 'number') {
      const dist = distanceKm(
        { lat: mechanicLat, lng: mechanicLng },
        { lat: populated.latitude, lng: populated.longitude }
      );
      servicePayload.distance_km = Number(dist.toFixed(2));
      if (normalizedStatus === 'in_progress' || normalizedStatus === 'accepted') {
        servicePayload.estimated_time = Math.max(2, Math.round((dist / 30) * 60));
      }
    }

    if (
      servicePayload.distance_km == null &&
      typeof (populated as any).distanceKm === 'number'
    ) {
      servicePayload.distance_km = Number((populated as any).distanceKm.toFixed?.(2) ?? (populated as any).distanceKm);
    }

    if (
      servicePayload.estimated_time == null &&
      typeof (populated as any).estimatedDurationMin === 'number'
    ) {
      servicePayload.estimated_time = Math.round((populated as any).estimatedDurationMin);
    }

    Object.keys(servicePayload).forEach((key) => {
      if (servicePayload[key] === undefined) {
        delete servicePayload[key];
      }
    });

    const createdAtIso =
      existing?.created_at ||
      (populated.createdAt ? new Date(populated.createdAt).toISOString() : nowIso);

    await servicesCollection.updateOne(
      { _id: populated._id },
      {
        $set: servicePayload,
        $setOnInsert: {
          created_at: createdAtIso,
          id: populated._id.toString(),
        },
      },
      { upsert: true }
    );
  } catch (error) {
    console.error('Failed to sync breakdown to services collection:', error);
  }
};

const createWithNotification = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const breakdown = await Breakdown.create(req.body);
    await emitBreakdownCreated(breakdown);
    await syncBreakdownToService(String(breakdown._id));
    res.status(201).json(breakdown);
  } catch (err) {
    next(err);
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
      await emitBreakdownAssigned(String(doc._id));
    }

    const statusChangedToClosed =
      typeof updates?.status === 'string' && updates.status === 'closed' && doc.status === 'closed';
    if (statusChangedToClosed) {
      await emitBreakdownCompleted(String(doc._id));
    }

    await syncBreakdownToService(String(doc._id));

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
    await emitBreakdownAssigned(String(doc._id));
    await syncBreakdownToService(String(doc._id));
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
    await emitBreakdownCompleted(String(doc._id));
    await syncBreakdownToService(String(doc._id));
    res.json(doc);
  })
);

export default router;

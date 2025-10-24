import { Router } from 'express';
import Breakdown from '../models/Breakdown.js';
import { buildCrudRouter } from '../utils/crud.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import Client from '../models/Client.js';
import User from '../models/User.js';
import { distanceKm } from '../utils/geo.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Breakdowns
 *   description: Gestion des pannes
 */

// CRUD de base
router.use('/', buildCrudRouter(Breakdown, 'Breakdown'));

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

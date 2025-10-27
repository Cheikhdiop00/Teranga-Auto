import { Router, Request, Response } from 'express';
import Mechanic from '../models/Mechanic.js';
import { buildCrudRouter } from '../utils/crud.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { distanceKm } from '../utils/geo.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Mechanics
 *   description: Gestion des mécaniciens
 */

// CRUD
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const mechanics = await Mechanic.find()
      .populate({
        path: 'user',
        select: 'firstName lastName phoneNumber profilePhoto address',
      })
      .lean();

    res.json(mechanics);
  }),
);

router.use('/', buildCrudRouter(Mechanic, 'Mechanic'));

/**
 * @openapi
 * /api/mechanics/nearby:
 *   get:
 *     tags: [Mechanics]
 *     summary: Rechercher mécaniciens proches
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
 *         schema: { type: number, default: 10 }
 *     responses:
 *       200:
 *         description: Liste des mécaniciens triés par distance
 */
router.get(
  '/nearby',
  asyncHandler(async (req: Request, res: Response) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radiusKm = req.query.radiusKm ? Number(req.query.radiusKm) : 10;
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ message: 'lat & lng are required numeric query params' });
    }

    const mechanics = await Mechanic.find({ latitude: { $ne: null }, longitude: { $ne: null } })
      .populate({
        path: 'user',
        select: 'firstName lastName phoneNumber profilePhoto address',
      })
      .lean();
    const enriched = mechanics
      .map((m: any) => {
        const d = distanceKm({ lat, lng }, { lat: m.latitude, lng: m.longitude });
        return { ...m, distanceKm: d };
      })
      .filter((m: any) => m.distanceKm <= radiusKm)
      .sort((a: any, b: any) => a.distanceKm - b.distanceKm);

    res.json(enriched);
  })
);

export default router;

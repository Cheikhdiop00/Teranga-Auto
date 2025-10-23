import { Router } from 'express';
import Breakdown from '../models/Breakdown.js';
import { buildCrudRouter } from '../utils/crud.js';
import { asyncHandler } from '../utils/asyncHandler.js';

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

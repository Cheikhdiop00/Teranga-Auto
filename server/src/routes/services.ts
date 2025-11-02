import { Router } from 'express';
import { Types } from 'mongoose';
import Service from '../models/Service.js';
import History from '../models/History.js';
import { buildCrudRouter } from '../utils/crud.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Services
 *   description: Gestion des services
 */

/**
 * @openapi
 * /api/services:
 *   get:
 *     tags: [Services]
 *     summary: Lister les services
 *   post:
 *     tags: [Services]
 *     summary: Actions collection (find, findOne) ou création selon le payload
 */

// Actions style collection: find, findOne
router.post(
  '/',
  asyncHandler(async (req, res, next) => {
    const { action, query, sort, limit } = req.body || {};
    if (!action) return next(); // Pas d'action -> laisser le CRUD gérer la création

    if (action === 'find') {
      let q = Service.find(query || {});
      if (sort) q = q.sort(sort);
      if (limit) q = q.limit(Number(limit));
      const data = await q.lean();
      return res.json({ data });
    }
    if (action === 'findOne') {
      const data = await Service.findOne(query || {}).lean();
      return res.json({ data });
    }

    return res.status(400).json({ error: 'Action invalide' });
  })
);

// Count style collection
router.post(
  '/count',
  asyncHandler(async (req, res) => {
    const { query } = req.body || {};
    const count = await Service.countDocuments(query || {});
    res.json({ count });
  })
);

router.post(
  '/purge',
  asyncHandler(async (req, res) => {
    const {
      mechanicId,
      mechanicRecordId,
      mechanicUserId,
      mechanicIds = [],
    } = req.body || {};

    const identifiers = [mechanicId, mechanicRecordId, mechanicUserId, ...mechanicIds]
      .flat()
      .filter((value): value is string => typeof value === 'string' && value.toString().trim().length > 0)
      .map((value) => value.toString().trim());

    if (!identifiers.length) {
      return res.status(400).json({ message: 'mechanicId or mechanicRecordId is required' });
    }

    const objectIds = identifiers
      .filter((value) => Types.ObjectId.isValid(value))
      .map((value) => new Types.ObjectId(value));

    const filter: any = {
      $or: [
        { mechanic_id: { $in: identifiers } },
        { mechanicId: { $in: identifiers } },
      ],
    };

    if (objectIds.length) {
      filter.$or.push({ mechanic_id: { $in: objectIds } });
      filter.$or.push({ mechanicId: { $in: objectIds } });
    }

    const deleteServicesResult = await Service.deleteMany(filter);

    let deletedHistoryCount = 0;
    if (objectIds.length) {
      const historyFilter = { mechanic: { $in: objectIds } };
      const historyResult = await History.deleteMany(historyFilter);
      deletedHistoryCount = historyResult.deletedCount || 0;
    }

    res.json({
      deletedServices: deleteServicesResult.deletedCount || 0,
      deletedHistories: deletedHistoryCount,
    });
  })
);

// Update style collection: updateOne
router.put(
  '/',
  asyncHandler(async (req, res) => {
    const { filter, update } = req.body || {};
    if (!filter || !update) return res.status(400).json({ message: 'filter and update are required' });
    const r = await Service.updateOne(filter, update);
    res.json({ success: true, matchedCount: r.matchedCount, modifiedCount: r.modifiedCount });
  })
);

// CRUD fallback (GET list, POST create, etc.)
router.use('/', buildCrudRouter(Service, 'Service'));

export default router;

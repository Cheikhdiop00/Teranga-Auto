import { Router } from 'express';
import Review from '../models/Review.js';
import { buildCrudRouter } from '../utils/crud.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import mongoose from 'mongoose';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Reviews
 *   description: Avis des clients sur les mécaniciens
 */

router.use('/', buildCrudRouter(Review, 'Review'));

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

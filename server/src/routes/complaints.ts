import { Router } from 'express';
import Complaint from '../models/Complaint.js';
import { buildCrudRouter } from '../utils/crud.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Complaints
 *   description: Réclamations
 */

// CRUD
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

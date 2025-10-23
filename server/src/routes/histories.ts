import { Router } from 'express';
import History from '../models/History.js';
import { buildCrudRouter } from '../utils/crud.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Histories
 *   description: Historique des interventions
 */

router.use('/', buildCrudRouter(History, 'History'));

/**
 * @openapi
 * /api/histories/byClient/{clientId}:
 *   get:
 *     tags: [Histories]
 *     summary: Historique d'un client
 */
router.get(
  '/byClient/:clientId',
  asyncHandler(async (req, res) => {
    const docs = await History.find({ client: req.params.clientId }).lean();
    res.json(docs);
  })
);

/**
 * @openapi
 * /api/histories/byMechanic/{mechanicId}:
 *   get:
 *     tags: [Histories]
 *     summary: Historique d'un mécanicien
 */
router.get(
  '/byMechanic/:mechanicId',
  asyncHandler(async (req, res) => {
    const docs = await History.find({ mechanic: req.params.mechanicId }).lean();
    res.json(docs);
  })
);

export default router;

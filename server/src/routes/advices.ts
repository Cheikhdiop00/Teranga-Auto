import { Router } from 'express';
import Advice from '../models/Advice.js';
import { buildCrudRouter } from '../utils/crud.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Advices
 *   description: Conseils
 */

router.use('/', buildCrudRouter(Advice, 'Advice'));

export default router;

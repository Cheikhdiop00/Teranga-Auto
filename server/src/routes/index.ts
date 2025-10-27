import { Router } from 'express';
import authRouter from './auth.js';
import usersRouter from './users.js';
import clientsRouter from './clients.js';
import mechanicsRouter from './mechanics.js';
import servicesRouter from './services.js';
import breakdownsRouter from './breakdowns.js';
import messagesRouter from './messages.js';
import notificationsRouter from './notifications.js';
import reviewsRouter from './reviews.js';
import complaintsRouter from './complaints.js';
import advicesRouter from './advices.js';
import adsRouter from './ads.js';
import historiesRouter from './histories.js';
import adminRouter from './admin.js';
import mailRouter from './mail.js';

const router = Router();

router.get('/', (_req, res) => {
  res.redirect('/docs');
});

router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/clients', clientsRouter);
router.use('/mechanics', mechanicsRouter);
router.use('/services', servicesRouter);
router.use('/breakdowns', breakdownsRouter);
router.use('/messages', messagesRouter);
router.use('/notifications', notificationsRouter);
router.use('/reviews', reviewsRouter);
router.use('/complaints', complaintsRouter);
router.use('/advices', advicesRouter);
router.use('/ads', adsRouter);
router.use('/histories', historiesRouter);
router.use('/admin', adminRouter);
router.use('/mail', mailRouter);

export default router;

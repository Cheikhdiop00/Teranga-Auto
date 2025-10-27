import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { sendMail } from '../services/emailService.js';

const router = Router();

// Protéger toutes les routes mail
router.use(requireAuth);

// GET /api/mail/test?to=email@example.com
router.get('/test', async (req, res, next) => {
  try {
    const to = String(req.query.to || '');
    if (!to) return res.status(400).json({ error: 'Paramètre "to" requis' });

    const info = await sendMail({
      to,
      subject: 'Test TerangaAuto',
      text: 'Ceci est un e-mail de test depuis TerangaAuto (Nodemailer).',
      html: '<p>Ceci est un <b>e-mail de test</b> depuis TerangaAuto (Nodemailer).</p>',
    });

    return res.json({ ok: true, messageId: info.messageId });
  } catch (err) {
    next(err);
  }
});

// POST /api/mail/send { to, subject, text?, html? }
router.post('/send', async (req, res, next) => {
  try {
    const { to, subject, text, html, from } = req.body || {};
    if (!to || !subject) {
      return res.status(400).json({ error: 'Champs requis: to, subject' });
    }

    const info = await sendMail({ to, subject, text, html, from });
    return res.json({ ok: true, messageId: info.messageId });
  } catch (err) {
    next(err);
  }
});

export default router;

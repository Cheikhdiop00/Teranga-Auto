import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { signToken, verifyToken } from '../utils/jwt.js';
import { requireAuth } from '../middlewares/auth.js';
import { sendActivationEmail, sendResetPasswordEmail } from '../utils/email.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Auth
 *   description: Authentification et gestion des tokens
 */
/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Inscription utilisateur (CLIENT ou MECANICIEN)
 *     description: Inscription pour les clients et mécaniciens. Le rôle ADMIN ne peut pas être créé via cette interface.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, password, role]
 *             properties:
 *               firstName: { type: string, example: "John" }
 *               lastName: { type: string, example: "Doe" }
 *               email: { type: string, format: email, example: "john.doe@example.com" }
 *               password: { type: string, format: password, minLength: 6, example: "password123" }
 *               phoneNumber: { type: string, example: "+221781234567" }
 *               nationalId: { type: string, example: "1234567890" }
 *               address: { type: string, example: "123 Rue de Dakar" }
 *               profilePhoto: { type: string, example: "https://example.com/photo.jpg" }
 *               role: 
 *                 type: string
 *                 enum: [CLIENT, MECANICIEN]
 *                 example: "CLIENT"
 *                 description: "Le rôle doit être soit 'CLIENT' soit 'MECANICIEN'"
 *     responses:
 *       201:
 *         description: Inscription réussie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Inscription réussie. Vérifiez votre email pour activer votre compte."
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "5f8d0f3d7a1b9c2e4f6g7h8"
 *                     firstName:
 *                       type: string
 *                       example: "John"
 *                     lastName:
 *                       type: string
 *                       example: "Doe"
 *                     email:
 *                       type: string
 *                       format: email
 *                       example: "john.doe@example.com"
 *                     role:
 *                       type: string
 *                       enum: [CLIENT, MECANICIEN]
 *                       example: "CLIENT"
 *                     status:
 *                       type: string
 *                       enum: [active, inactive, pending]
 *                       example: "active"
 *                     phoneNumber:
 *                       type: string
 *                       example: "+221781234567"
 *                     profilePhoto:
 *                       type: string
 *                       example: "https://example.com/photo.jpg"
 *                     nationalId:
 *                       type: string
 *                       example: "1234567890"
 *                     address:
 *                       type: string
 *                       example: "123 Rue de Dakar"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Données invalides ou manquantes
 *       409:
 *         description: Email déjà utilisé
 */
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { email, password, firstName, lastName, phoneNumber, role, nationalId, address, profilePhoto } = req.body;

    // Vérifier que le rôle est valide (CLIENT ou MECANICIEN)
    if (!['CLIENT', 'MECANICIEN'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Le rôle doit être 'CLIENT' ou 'MECANICIEN'"
      });
    }
    
    // Vérifier si l'email existe déjà
    const existing = await User.findOne({ email }).lean();
    if (existing) {
      return res.status(409).json({ 
        success: false,
        message: 'Cet email est déjà utilisé' 
      });
    }

    // Créer l'utilisateur avec le rôle spécifié
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      phoneNumber,
      role,
      status: 'active', // Changé de 'pending' à 'active'
      profilePhoto
    });

    // Créer le document Client ou Mechanic selon le rôle
    if (role === 'CLIENT') {
      const Client = (await import('../models/Client.js')).default;
      await Client.create({ user: user._id, nationalId, address });
    } else if (role === 'MECANICIEN') {
      const Mechanic = (await import('../models/Mechanic.js')).default;
      await Mechanic.create({ user: user._id, nationalId, address });
    }

    // Envoi d'email d'activation (non-bloquant)
    try {
      const activationToken = signToken({ id: user._id.toString(), role: user.role }, '24h');
      console.log('📧 Génération token activation pour:', user.email);

      // Ne pas attendre l'envoi d'email pour éviter les timeouts
      sendActivationEmail(user.email, activationToken)
        .then((result: any) => {
          console.log('✅ Email d\'activation envoyé avec succès à:', user.email);
          console.log('   Message ID:', result.messageId);
        })
        .catch((err: any) => {
          console.error('❌ Erreur envoi email activation:', err.message);
          console.error('   Destinataire:', user.email);
          console.error('   Token généré:', !!activationToken);
        });
    } catch (error) {
      console.error('❌ Erreur génération token activation:', (error as Error).message);
      console.error('   Pour utilisateur:', user.email);
    }

    const token = signToken({ id: user._id.toString(), role: user.role });
    
    // Ne pas renvoyer le mot de passe dans la réponse
    const userResponse = user.toObject();
    delete userResponse.password;
    
    // Récupérer les informations supplémentaires du client ou du mécanicien
    let additionalInfo = {};
    if (role === 'CLIENT') {
      const Client = (await import('../models/Client.js')).default;
      const clientInfo = await Client.findOne({ user: user._id });
      if (clientInfo) additionalInfo = clientInfo.toObject();
    } else if (role === 'MECANICIEN') {
      const Mechanic = (await import('../models/Mechanic.js')).default;
      const mechanicInfo = await Mechanic.findOne({ user: user._id });
      if (mechanicInfo) additionalInfo = mechanicInfo.toObject();
    }
    
    res.status(201).json({ 
      success: true,
      message: `Inscription réussie. Vérifiez votre email pour activer votre compte.`,
      token,
      user: {
        ...userResponse,
        ...additionalInfo,
        id: user._id
      }
    });
  })
);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Connexion utilisateur
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Connexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *                 user: { type: object }
 *       401:
 *         description: Identifiants invalides
 *       403:
 *         description: Compte non activé
 */
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    console.log('Login attempt:', { email, password: '***' });
    const user = await User.findOne({ email }).select('+password');
    console.log('User found:', user ? { email: user.email, status: user.status, role: user.role } : 'null');
    if (!user) {
      console.log('User not found');
      return res.status(401).json({ 
        success: false,
        message: 'Identifiants invalides' 
      });
    }

    if (user.status !== 'active') {
      console.log('User status not active:', user.status);
      return res.status(403).json({ 
        success: false,
        message: 'Compte non activé. Veuillez vérifier votre email pour l\'activer.' 
      });
    }

    const isValid = await bcrypt.compare(password, user.password);
    console.log('Password valid:', isValid);
    if (!isValid) {
      console.log('Invalid password');
      return res.status(401).json({ 
        success: false,
        message: 'Identifiants invalides' 
      });
    }

    const token = signToken({ id: user._id.toString(), role: user.role as any });
    console.log('Login successful for:', user.email);
    res.json({ token, user });
  })
);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Profil courant (via token)
 */
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user!.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  })
);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Déconnexion (invalide le token côté client)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Déconnexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *       401:
 *         description: Non authentifié
 */
router.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    // Pour JWT stateless, la déconnexion est gérée côté client (suppression du token)
    // Ici, on peut ajouter une blacklist si nécessaire, mais pour simplicité :
    res.json({ message: 'Déconnexion réussie. Supprimez le token côté client.' });
  })
);

/**
 * @openapi
 * /api/auth/profile:
 *   patch:
 *     tags: [Auth]
 *     summary: Mettre à jour le profil (nom, email, etc.)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               email: { type: string, format: email }
 *               phoneNumber: { type: string }
 *               profilePhoto: { type: string }
 *     responses:
 *       200:
 *         description: Profil mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 user: { type: object }
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Utilisateur non trouvé
 *       409:
 *         description: Email déjà utilisé
 */
router.patch(
  '/profile',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { firstName, lastName, email, phoneNumber, profilePhoto } = req.body;
    const userId = req.user!.id;

    // Vérifier si email déjà utilisé par un autre
    if (email) {
      const existing = await User.findOne({ email, _id: { $ne: userId } });
      if (existing) return res.status(409).json({ message: 'Email déjà utilisé' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { firstName, lastName, email, phoneNumber, profilePhoto },
      { new: true }
    ).select('-password');

    if (!updatedUser) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    res.json({ message: 'Profil mis à jour', user: updatedUser });
  })
);

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Demande de réinitialisation de mot de passe
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 */
router.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    const resetToken = signToken({ id: user._id.toString() }, '1h');
    await sendResetPasswordEmail(user.email, resetToken);

    res.json({ message: 'Email de réinitialisation envoyé' });
  })
);

/**
 * @openapi
 * /api/auth/reset-password/{token}:
 *   post:
 *     tags: [Auth]
 *     summary: Réinitialiser le mot de passe
 *     parameters:
 *       - name: token
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Token de réinitialisation envoyé par email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newPassword]
 *             properties:
 *               newPassword: { type: string, minLength: 6 }
 *     responses:
 *       200:
 *         description: Mot de passe réinitialisé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *       400:
 *         description: Token invalide
 */
router.post(
  '/reset-password/:token',
  asyncHandler(async (req, res) => {
    const { token } = req.params;
    const { newPassword } = req.body;
    try {
      const decoded = verifyToken(token) as any;
      const user = await User.findById(decoded.id);
      if (!user) return res.status(400).json({ message: 'Token invalide' });

      user.password = newPassword;
      user.status = 'active'; // Activate if pending
      await user.save();

      res.json({ message: 'Mot de passe réinitialisé avec succès' });
    } catch (err) {
      res.status(400).json({ message: 'Token invalide' });
    }
  })
);

/**
 * @openapi
 * /api/auth/change-password:
 *   patch:
 *     tags: [Auth]
 *     summary: Changer le mot de passe (authentifié)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [oldPassword, newPassword]
 *             properties:
 *               oldPassword: { type: string }
 *               newPassword: { type: string, minLength: 6 }
 *     responses:
 *       200:
 *         description: Mot de passe changé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *       401:
 *         description: Non authentifié ou ancien MDP incorrect
 *       404:
 *         description: Utilisateur non trouvé
 */
router.patch(
  '/change-password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user!.id).select('+password');
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    const isValid = await bcrypt.compare(oldPassword, user.password);
    if (!isValid) return res.status(401).json({ message: 'Ancien mot de passe incorrect' });

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Mot de passe changé avec succès' });
  })
);

/**
 * @openapi
 * /api/auth/activate/{token}:
 *   get:
 *     tags: [Auth]
 *     summary: Activer le compte via email
 *     parameters:
 *       - name: token
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Token d'activation envoyé par email
 *     responses:
 *       200:
 *         description: Compte activé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *       400:
 *         description: Token invalide ou expiré
 */
router.get(
  '/activate/:token',
  asyncHandler(async (req, res) => {
    const { token } = req.params;
    try {
      const decoded = verifyToken(token) as any;
      const user = await User.findById(decoded.id);
      if (!user || user.status === 'active') {
        return res.status(400).json({ message: 'Token invalide ou expiré' });
      }
      user.status = 'active';
      await user.save();
      res.json({ message: 'Compte activé avec succès. Vous pouvez maintenant vous connecter.' });
    } catch (err) {
      res.status(400).json({ message: 'Token invalide' });
    }
  })
);

// Route temporaire pour créer un admin (à supprimer en production)
router.post(
  '/create-admin',
  asyncHandler(async (req, res) => {
    const { email = 'admin@example.com', password = 'admin123' } = req.body;
    
    // Vérifier si un admin existe déjà
    const adminExists = await User.findOne({ role: 'ADMIN' });
    if (adminExists) {
      return res.status(400).json({
        success: false,
        message: 'Un administrateur existe déjà',
        admin: {
          email: adminExists.email,
          role: adminExists.role
        }
      });
    }

    // Créer l'admin
    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'System',
      email,
      password,
      role: 'ADMIN',
      status: 'active',
      phoneNumber: '+221000000000'
    });

    // Ne pas renvoyer le mot de passe
    const adminResponse = admin.toObject();
    delete adminResponse.password;

    res.status(201).json({
      success: true,
      message: 'Compte administrateur créé avec succès',
      admin: adminResponse,
      credentials: {
        email,
        password: 'admin123' // À ne faire qu'en développement
      }
    });
  })
);

export default router;

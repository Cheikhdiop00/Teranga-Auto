import { Router } from 'express';
import { updateLocation, getUserLocation, calculateDistance } from '../controllers/locationController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(requireAuth);

// Mettre à jour la position de l'utilisateur connecté
router.patch('/update-location', updateLocation);

// Obtenir la position d'un utilisateur spécifique (seulement pour les mécaniciens)
router.get('/user/:userId/location', getUserLocation);

// Calculer la distance entre le client et un mécanicien
router.get('/distance/:targetUserId', calculateDistance);

export default router;

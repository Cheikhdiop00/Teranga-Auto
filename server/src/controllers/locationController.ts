import { Request, Response } from 'express';
import User from '../models/User';

export const updateLocation = async (req: Request, res: Response) => {
  try {
    const { latitude, longitude } = req.body;
    const userId = (req as any).user.id;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude et longitude sont requises'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        lastLocationUpdate: new Date()
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      data: {
        latitude: user.latitude,
        longitude: user.longitude,
        lastLocationUpdate: user.lastLocationUpdate
      }
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la position:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la mise à jour de la position'
    });
  }
};

export const getUserLocation = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('firstName lastName latitude longitude lastLocationUpdate role');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Ne retourner la position que pour les mécaniciens
    if (user.role !== 'MECANICIEN') {
      return res.status(403).json({
        success: false,
        message: 'Position non disponible pour cet utilisateur'
      });
    }

    res.json({
      success: true,
      data: {
        firstName: user.firstName,
        lastName: user.lastName,
        latitude: user.latitude,
        longitude: user.longitude,
        lastLocationUpdate: user.lastLocationUpdate
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la position:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération de la position'
    });
  }
};

export const calculateDistance = async (req: Request, res: Response) => {
  try {
    const { targetUserId } = req.params;
    const { clientLat, clientLng } = req.query;
    const userId = (req as any).user.id;

    if (!clientLat || !clientLng) {
      return res.status(400).json({
        success: false,
        message: 'Coordonnées du client requises'
      });
    }

    const targetUser = await User.findById(targetUserId).select('latitude longitude role');
    const clientUser = await User.findById(userId).select('latitude longitude');

    if (!targetUser || !clientUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    if (targetUser.role !== 'MECANICIEN') {
      return res.status(403).json({
        success: false,
        message: 'Position non disponible pour cet utilisateur'
      });
    }

    if (!targetUser.latitude || !targetUser.longitude) {
      return res.json({
        success: true,
        data: {
          distance: null,
          message: 'Position du mécanicien non disponible'
        }
      });
    }

    // Calcul de la distance en km (formule de Haversine simplifiée)
    const R = 6371; // Rayon de la Terre en km
    const dLat = (targetUser.latitude - clientUser.latitude) * Math.PI / 180;
    const dLng = (targetUser.longitude - clientUser.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(clientUser.latitude * Math.PI / 180) * Math.cos(targetUser.latitude * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    res.json({
      success: true,
      data: {
        distance: Math.round(distance * 100) / 100, // Arrondi à 2 décimales
        clientCoordinates: {
          latitude: clientUser.latitude,
          longitude: clientUser.longitude
        },
        mechanicCoordinates: {
          latitude: targetUser.latitude,
          longitude: targetUser.longitude
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors du calcul de la distance:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors du calcul de la distance'
    });
  }
};

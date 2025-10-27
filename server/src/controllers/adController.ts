import { Request, Response } from 'express';
import Ad from '../models/Ad.js';
import { getIO } from '../socket.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createAd = asyncHandler(async (req: any, res: Response) => {
  const { title, description, imageUrl, category, startDate, endDate, targetRoles, priority } = req.body;
  
  const ad = await Ad.create({
    title,
    description,
    imageUrl,
    category,
    startDate: startDate || new Date(),
    endDate,
    targetRoles: targetRoles || ['ALL'],
    priority: priority || 5,
    publishedBy: req.user.id,
    isPublished: false
  });

  res.status(201).json({
    success: true,
    data: ad
  });
  try { getIO().emit('ads_updated', { action: 'create', id: ad._id }); } catch {}
});

export const updateAd = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const { title, description, imageUrl, category, startDate, endDate, targetRoles, priority, isPublished } = req.body;

  const ad = await Ad.findById(id);
  if (!ad) {
    return res.status(404).json({
      success: false,
      message: 'Annonce non trouvée'
    });
  }

  // Seul l'admin peut publier/dépublier
  if (typeof isPublished !== 'undefined' && req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Non autorisé à modifier le statut de publication'
    });
  }

  const updates = {
    title,
    description,
    imageUrl,
    category,
    startDate,
    endDate,
    targetRoles,
    priority,
    isPublished: req.user.role === 'ADMIN' ? isPublished : ad.isPublished
  };

  const updatedAd = await Ad.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: updatedAd
  });
  try { getIO().emit('ads_updated', { action: 'update', id }); } catch {}
});

export const getAds = asyncHandler(async (req: any, res: Response) => {
  const { role } = req.user;
  const now = new Date();
  
  const query = {
    isPublished: true,
    $and: [
      {
        $or: [
          { targetRoles: 'ALL' },
          { targetRoles: role }
        ]
      },
      {
        startDate: { $lte: now },
        $or: [
          { endDate: { $exists: false } },
          { endDate: null },
          { endDate: { $gte: now } }
        ]
      }
    ],
    active: true
  };

  const ads = await Ad.find(query)
    .sort({ priority: -1, createdAt: -1 })
    .populate('publishedBy', 'firstName lastName');

  res.status(200).json({
    success: true,
    count: ads.length,
    data: ads
  });
});

export const getAdById = asyncHandler(async (req: Request, res: Response) => {
  const ad = await Ad.findById(req.params.id).populate('publishedBy', 'firstName lastName');
  
  if (!ad) {
    return res.status(404).json({
      success: false,
      message: 'Annonce non trouvée'
    });
  }

  res.status(200).json({
    success: true,
    data: ad
  });
});

export const deleteAd = asyncHandler(async (req: any, res: Response) => {
  const ad = await Ad.findById(req.params.id);
  
  if (!ad) {
    return res.status(404).json({
      success: false,
      message: 'Annonce non trouvée'
    });
  }

  // Seul l'admin ou le créateur peut supprimer
  if (req.user.role !== 'ADMIN' && ad.publishedBy.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Non autorisé à supprimer cette annonce'
    });
  }

  await ad.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
  try { getIO().emit('ads_updated', { action: 'delete', id: req.params.id }); } catch {}
});

export const getAdminAds = asyncHandler(async (req: any, res: Response) => {
  // Seul l'admin peut voir toutes les annonces
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Non autorisé à accéder à cette ressource'
    });
  }

  const ads = await Ad.find({})
    .sort({ createdAt: -1 })
    .populate('publishedBy', 'firstName lastName');

  res.status(200).json({
    success: true,
    count: ads.length,
    data: ads
  });
});

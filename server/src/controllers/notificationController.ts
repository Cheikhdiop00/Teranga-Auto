import { Request, Response } from 'express';
import Notification from '../models/Notification.js';
import { getIO } from '../socket.js';

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { limit = 10, page = 1 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Notification.countDocuments({ user: userId });
    const unreadCount = await Notification.countDocuments({ user: userId, read: false });

    res.json({
      success: true,
      data: notifications,
      pagination: {
        total,
        page: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        unreadCount
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des notifications' });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, user: userId },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification non trouvée' });
    }

    const unreadCount = await Notification.countDocuments({ user: userId, read: false });

    res.json({
      success: true,
      data: notification,
      unreadCount
    });
    try {
      getIO().to(`user_${userId}`).emit('notifications_unread', { count: unreadCount });
    } catch {}
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour de la notification' });
  }
};

export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    await Notification.updateMany(
      { user: userId, read: false },
      { $set: { read: true } }
    );

    res.json({
      success: true,
      message: 'Toutes les notifications ont été marquées comme lues'
    });
    try {
      getIO().to(`user_${userId}`).emit('notifications_unread', { count: 0 });
    } catch {}
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour des notifications' });
  }
};

export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Identifiant de notification invalide' });
    }

    const notification = await Notification.findOneAndDelete({ _id: id, user: userId });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification non trouvée' });
    }

    const unreadCount = await Notification.countDocuments({ user: userId, read: false });

    res.json({
      success: true,
      message: 'Notification supprimée',
      unreadCount,
    });

    try {
      getIO().to(`user_${userId}`).emit('notifications_unread', { count: unreadCount });
    } catch {}
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la suppression de la notification' });
  }
};

export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const count = await Notification.countDocuments({ user: userId, read: false });
    
    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération du nombre de notifications non lues' });
  }
};

// Fonction utilitaire pour créer une notification
export const createNotification = async (userId: string, title: string, content: string, type?: string) => {
  try {
    const notification = new Notification({
      user: userId,
      title,
      content,
      type,
      read: false
    });

    await notification.save();
    try {
      const unread = await Notification.countDocuments({ user: userId, read: false });
      getIO().to(`user_${userId}`).emit('notifications_unread', { count: unread });
    } catch {}
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';

export const getConversations = asyncHandler(async (req: Request & { user: any }, res: Response) => {
  const userId = req.user.id;

  const conversations = await Conversation.find({
    participants: userId,
    isActive: true
  })
  .populate('participants', 'firstName lastName profilePhoto role')
  .populate({
    path: 'lastMessage',
    populate: {
      path: 'sender',
      select: 'firstName lastName'
    }
  })
  .sort({ updatedAt: -1 });

  // Ajouter le nombre de messages non lus pour chaque conversation
  const conversationsWithUnread = await Promise.all(
    conversations.map(async (conv: any) => {
      const unreadCount = await Message.countDocuments({
        conversation: conv._id,
        sender: { $ne: userId },
        read: false
      });

      return {
        ...conv.toObject(),
        unreadCount
      };
    })
  );

  res.json({
    success: true,
    count: conversationsWithUnread.length,
    data: conversationsWithUnread
  });
});

export const getMessages = asyncHandler(async (req: Request & { user: any }, res: Response) => {
  const { conversationId } = req.params;
  const userId = req.user.id;

  // Vérifier que l'utilisateur fait partie de la conversation
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
    isActive: true
  });

  if (!conversation) {
    return res.status(403).json({
      success: false,
      message: 'Accès non autorisé à cette conversation'
    });
  }

  const messages = await Message.find({ conversation: conversationId })
    .sort({ createdAt: 1 })
    .populate('sender', 'firstName lastName profilePhoto');

  // Marquer tous les messages non lus comme lus
  await Message.updateMany(
    { conversation: conversationId, sender: { $ne: userId }, read: false },
    { $set: { read: true, readAt: new Date() } }
  );

  res.json({
    success: true,
    count: messages.length,
    data: messages
  });
});

export const startConversation = asyncHandler(async (req: Request & { user: any }, res: Response) => {
  const { participantId, content, messageType = 'text', fileUrl, fileName } = req.body;
  const userId = req.user.id;

  if (userId === participantId) {
    return res.status(400).json({
      success: false,
      message: 'Vous ne pouvez pas démarrer une conversation avec vous-même'
    });
  }

  // Vérifier si l'utilisateur cible existe
  const User = (await import('../models/User.js')).default;
  const participant = await User.findById(participantId);
  if (!participant) {
    return res.status(404).json({
      success: false,
      message: 'Utilisateur non trouvé'
    });
  }

  // Récupérer les infos de l'expéditeur (pour répondre avec le nom correct)
  const senderUser = await User.findById(userId).select('firstName lastName');

  // Vérifier si une conversation existe déjà
  let conversation = await Conversation.findOne({
    participants: { $all: [userId, participantId], $size: 2 },
    isActive: true
  });

  if (!conversation) {
    try {
      conversation = await Conversation.create({
        participants: [userId, participantId],
        isActive: true,
      });
    } catch (error: any) {
      if (error?.code === 11000) {
        conversation = await Conversation.findOne({
          participants: { $all: [userId, participantId], $size: 2 },
          isActive: true,
        });
      } else {
        throw error;
      }
    }
  }

  // Si un message initial est fourni, le créer
  let initialMessage = null;
  if (content && content.trim()) {
    const message = new Message({
      conversation: conversation._id,
      sender: userId,
      content: content.trim(),
      read: false,
      messageType,
      fileUrl,
      fileName
    });

    initialMessage = await message.save();

    // Mettre à jour la dernière conversation
    await Conversation.findByIdAndUpdate(conversation._id, {
      lastMessage: initialMessage._id,
      updatedAt: new Date()
    });
  }

  // Récupérer la conversation avec les informations complètes
  const populatedConversation = await Conversation.findById(conversation._id)
    .populate('participants', 'firstName lastName profilePhoto role')
    .populate({
      path: 'lastMessage',
      populate: {
        path: 'sender',
        select: 'firstName lastName'
      }
    });

  res.status(201).json({
    success: true,
    data: populatedConversation,
    initialMessage: initialMessage ? {
      ...initialMessage.toObject(),
      sender: {
        _id: userId,
        firstName: senderUser?.firstName,
        lastName: senderUser?.lastName
      }
    } : null
  });
});

export const deleteConversation = asyncHandler(async (req: Request & { user: any }, res: Response) => {
  const { conversationId } = req.params;
  const userId = req.user.id;

  // Vérifier que l'utilisateur fait partie de la conversation
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId
  });

  if (!conversation) {
    return res.status(404).json({
      success: false,
      message: 'Conversation non trouvée'
    });
  }

  // Désactiver la conversation au lieu de la supprimer complètement
  await Conversation.findByIdAndUpdate(conversationId, {
    isActive: false,
    updatedAt: new Date()
  });

  res.json({
    success: true,
    message: 'Conversation supprimée avec succès'
  });
});

export const getUnreadCount = asyncHandler(async (req: Request & { user: any }, res: Response) => {
  const userId = req.user.id;

  const totalUnread = await Message.countDocuments({
    conversation: {
      $in: await Conversation.find({
        participants: userId,
        isActive: true
      }).select('_id')
    },
    sender: { $ne: userId },
    read: false
  });

  res.json({
    success: true,
    data: { totalUnread }
  });
});

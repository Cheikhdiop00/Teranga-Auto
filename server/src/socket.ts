import { Server } from 'socket.io';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';
import { JwtUser } from './middlewares/auth.js';
import Message from './models/Message.js';
import Conversation from './models/Conversation.js';

let io: Server;
// Map userId -> connection count
const onlineUsers = new Map<string, number>();

export const initSocket = (app: any) => {
  const server = createServer(app);
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST']
    }
  });

  io.use((socket: any, next: any) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentification requise'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtUser;
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Token invalide'));
    }
  }).on('connection', (socket: any) => {
    console.log('Nouvelle connexion:', socket.user.id);
    socket.join(`user_${socket.user.id}`);

    // Presence: increment and notify
    const uid = String(socket.user.id);
    const count = (onlineUsers.get(uid) || 0) + 1;
    onlineUsers.set(uid, count);
    if (count === 1) {
      io.emit('user_online', { userId: uid });
    }

    // Gestion des messages
    socket.on('send_message', async (data: any) => {
      try {
        const {
          conversationId,
          content,
          recipientId,
          messageType = 'text',
          fileUrl,
          fileName,
          audioDurationMs,
        } = data;

        if (!conversationId || !recipientId) {
          socket.emit('error', { message: 'Conversation et destinataire requis' });
          return;
        }

        const trimmedContent = typeof content === 'string' ? content.trim() : '';
        const requiresFile = messageType === 'image' || messageType === 'file' || messageType === 'audio';
        if (requiresFile && !fileUrl) {
          socket.emit('error', { message: 'fileUrl est requis pour ce type de message' });
          return;
        }

        // Créer le message
        const message = new Message({
          conversation: conversationId,
          sender: socket.user.id,
          content: trimmedContent || (messageType === 'audio' ? '[audio]' : ''),
          read: false,
          messageType,
          fileUrl,
          fileName,
          audioDurationMs
        });

        await message.save();

        // Mettre à jour la dernière conversation
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: message._id,
          updatedAt: new Date()
        });

        // Envoyer le message au destinataire
        io.to(`user_${recipientId}`).emit('new_message', {
          conversationId,
          message: {
            ...message.toObject(),
            sender: {
              _id: socket.user.id,
              firstName: socket.user.firstName,
              lastName: socket.user.lastName
            }
          }
        });

        // Confirmer la réception du message
        socket.emit('message_sent', message);

        // Notifier tous les participants de la conversation
        const conversation = await Conversation.findById(conversationId).populate('participants', 'firstName lastName');
        if (conversation) {
          conversation.participants.forEach((participant: any) => {
            io.to(`user_${participant._id}`).emit('conversation_updated', {
              conversationId,
              lastMessage: message
            });
          });
        }

      } catch (error) {
        console.error('Erreur lors de l\'envoi du message:', error);
        socket.emit('error', { message: 'Erreur lors de l\'envoi du message' });
      }
    });

    // Marquer les messages comme lus
    socket.on('mark_as_read', async (data: any) => {
      try {
        const { messageIds } = data;
        await Message.updateMany(
          { _id: { $in: messageIds }, sender: { $ne: socket.user.id } },
          { $set: { read: true, readAt: new Date() } }
        );

        // Notifier l'expéditeur que ses messages ont été lus
        const messages = await Message.find({ _id: { $in: messageIds } }).populate('sender');
        messages.forEach((msg: any) => {
          io.to(`user_${msg.sender._id}`).emit('messages_read', {
            messageIds: [msg._id],
            conversationId: msg.conversation
          });
        });

      } catch (error) {
        console.error('Erreur lors du marquage des messages comme lus:', error);
      }
    });

    // Rejoindre une conversation
    socket.on('join_conversation', (conversationId: string) => {
      socket.join(`conversation_${conversationId}`);
    });

    // Quitter une conversation
    socket.on('leave_conversation', (conversationId: string) => {
      socket.leave(`conversation_${conversationId}`);
    });

    // Indicateur de frappe
    socket.on('typing_start', (data: { conversationId: string, recipientId: string }) => {
      io.to(`user_${data.recipientId}`).emit('user_typing', {
        conversationId: data.conversationId,
        userId: socket.user.id,
        isTyping: true
      });
    });

    socket.on('typing_stop', (data: { conversationId: string, recipientId: string }) => {
      io.to(`user_${data.recipientId}`).emit('user_typing', {
        conversationId: data.conversationId,
        userId: socket.user.id,
        isTyping: false
      });
    });

    // Presence query
    socket.on('get_presence', (payload: { userId: string }) => {
      const online = (onlineUsers.get(String(payload?.userId)) || 0) > 0;
      socket.emit('presence', { userId: String(payload?.userId), online });
    });

    socket.on('disconnect', () => {
      const uid = String(socket.user?.id);
      const prev = onlineUsers.get(uid) || 0;
      const next = Math.max(prev - 1, 0);
      if (next === 0) {
        onlineUsers.delete(uid);
        io.emit('user_offline', { userId: uid });
      } else {
        onlineUsers.set(uid, next);
      }
      console.log('Déconnecté:', socket.user?.id);
    });
  });

  return { server, io };
};

export const getIO = () => io;

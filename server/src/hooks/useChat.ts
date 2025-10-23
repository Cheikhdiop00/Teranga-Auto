import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  profilePhoto?: string;
  role: string;
}

interface Message {
  _id: string;
  conversation: string;
  sender: User;
  content: string;
  read: boolean;
  readAt?: Date;
  messageType: 'text' | 'image' | 'file';
  fileUrl?: string;
  fileName?: string;
  createdAt: string;
}

interface Conversation {
  _id: string;
  participants: User[];
  lastMessage?: Message;
  isActive: boolean;
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface UseChatReturn {
  socket: Socket | null;
  isConnected: boolean;
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  error: string | null;
  sendMessage: (content: string, conversationId: string, recipientId: string, messageType?: 'text' | 'image' | 'file', fileUrl?: string, fileName?: string) => void;
  startConversation: (participantId: string) => Promise<Conversation>;
  markAsRead: (messageIds: string[]) => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  startTyping: (conversationId: string, recipientId: string) => void;
  stopTyping: (conversationId: string, recipientId: string) => void;
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  getUnreadCount: () => Promise<number>;
}

export const useChat = (token: string): UseChatReturn => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Connexion Socket.IO
  useEffect(() => {
    if (!token) return;

    const newSocket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', {
      auth: { token },
      transports: ['websocket'],
      upgrade: true,
      rememberUpgrade: true,
    });

    newSocket.on('connect', () => {
      console.log('Connecté au chat');
      setIsConnected(true);
      setError(null);
    });

    newSocket.on('disconnect', () => {
      console.log('Déconnecté du chat');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.error('Erreur de connexion:', err);
      setError('Erreur de connexion au serveur de chat');
      setIsConnected(false);
    });

    // Gestion des nouveaux messages
    newSocket.on('new_message', (data: { conversationId: string; message: Message }) => {
      setMessages(prev => [...prev, data.message]);

      // Mettre à jour la conversation
      setConversations(prev =>
        prev.map(conv =>
          conv._id === data.conversationId
            ? { ...conv, lastMessage: data.message, unreadCount: (conv.unreadCount || 0) + 1 }
            : conv
        ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      );

      // Si c'est la conversation active, marquer comme lu
      if (activeConversation?._id === data.conversationId) {
        markAsRead([data.message._id]);
      }
    });

    // Gestion des messages lus
    newSocket.on('messages_read', (data: { messageIds: string[]; conversationId: string }) => {
      setMessages(prev =>
        prev.map(msg =>
          data.messageIds.includes(msg._id)
            ? { ...msg, read: true, readAt: new Date() }
            : msg
        )
      );
    });

    // Gestion des indicateurs de frappe
    newSocket.on('user_typing', (data: { conversationId: string; userId: string; isTyping: boolean }) => {
      // Vous pouvez gérer l'affichage des indicateurs de frappe ici
      console.log(`Utilisateur ${data.userId} ${data.isTyping ? 'tape' : 'arrête de taper'} dans ${data.conversationId}`);
    });

    // Gestion des mises à jour de conversation
    newSocket.on('conversation_updated', (data: { conversationId: string; lastMessage: Message }) => {
      setConversations(prev =>
        prev.map(conv =>
          conv._id === data.conversationId
            ? { ...conv, lastMessage: data.lastMessage }
            : conv
        )
      );
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  // Récupérer les conversations
  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/messages/conversations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des conversations');
      }

      const data = await response.json();
      setConversations(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      console.error('Erreur fetchConversations:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Récupérer les messages d'une conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/messages/conversations/${conversationId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des messages');
      }

      const data = await response.json();
      setMessages(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      console.error('Erreur fetchMessages:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Démarrer une conversation
  const startConversation = useCallback(async (participantId: string): Promise<Conversation> => {
    try {
      setError(null);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/messages/conversations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ participantId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la création de la conversation');
      }

      const data = await response.json();
      const newConversation = data.data;

      // Ajouter à la liste des conversations
      setConversations(prev => [newConversation, ...prev]);

      return newConversation;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [token]);

  // Envoyer un message
  const sendMessage = useCallback((
    content: string,
    conversationId: string,
    recipientId: string,
    messageType: 'text' | 'image' | 'file' = 'text',
    fileUrl?: string,
    fileName?: string
  ) => {
    if (!socket || !isConnected) {
      setError('Non connecté au serveur de chat');
      return;
    }

    socket.emit('send_message', {
      conversationId,
      content,
      recipientId,
      messageType,
      fileUrl,
      fileName
    });
  }, [socket, isConnected]);

  // Marquer les messages comme lus
  const markAsRead = useCallback((messageIds: string[]) => {
    if (!socket || !isConnected) return;

    socket.emit('mark_as_read', { messageIds });
  }, [socket, isConnected]);

  // Rejoindre une conversation
  const joinConversation = useCallback((conversationId: string) => {
    if (!socket || !isConnected) return;

    socket.emit('join_conversation', conversationId);
  }, [socket, isConnected]);

  // Quitter une conversation
  const leaveConversation = useCallback((conversationId: string) => {
    if (!socket || !isConnected) return;

    socket.emit('leave_conversation', conversationId);
  }, [socket, isConnected]);

  // Démarrer la frappe
  const startTyping = useCallback((conversationId: string, recipientId: string) => {
    if (!socket || !isConnected) return;

    socket.emit('typing_start', { conversationId, recipientId });
  }, [socket, isConnected]);

  // Arrêter la frappe
  const stopTyping = useCallback((conversationId: string, recipientId: string) => {
    if (!socket || !isConnected) return;

    socket.emit('typing_stop', { conversationId, recipientId });
  }, [socket, isConnected]);

  // Récupérer le nombre de messages non lus
  const getUnreadCount = useCallback(async (): Promise<number> => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/messages/unread-count`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération du nombre de messages non lus');
      }

      const data = await response.json();
      return data.data.totalUnread || 0;
    } catch (err) {
      console.error('Erreur getUnreadCount:', err);
      return 0;
    }
  }, [token]);

  return {
    socket,
    isConnected,
    conversations,
    activeConversation,
    messages,
    loading,
    error,
    sendMessage,
    startConversation,
    markAsRead,
    joinConversation,
    leaveConversation,
    startTyping,
    stopTyping,
    fetchConversations,
    fetchMessages,
    getUnreadCount
  };
};

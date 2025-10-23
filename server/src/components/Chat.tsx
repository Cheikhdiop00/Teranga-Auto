import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useChat } from '../hooks/useChat';

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
  messageType: 'text' | 'image' | 'file';
  fileUrl?: string;
  fileName?: string;
  createdAt: string;
}

interface Conversation {
  _id: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount?: number;
}

interface ChatProps {
  token: string;
  currentUser: User;
  className?: string;
}

const Chat: React.FC<ChatProps> = ({ token, currentUser, className = '' }) => {
  const {
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
    fetchMessages
  } = useChat(token);

  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Charger les conversations au montage
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Faire défiler vers le bas lors de nouveaux messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Gérer la frappe
  const handleInputChange = useCallback((value: string) => {
    setMessageInput(value);

    if (!activeConversation) return;

    const recipient = activeConversation.participants.find(p => p._id !== currentUser._id);
    if (!recipient) return;

    if (!isTyping && value.trim()) {
      setIsTyping(true);
      startTyping(activeConversation._id, recipient._id);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      stopTyping(activeConversation._id, recipient._id);
    }, 1000);
  }, [activeConversation, currentUser._id, isTyping, startTyping, stopTyping]);

  // Sélectionner une conversation
  const selectConversation = useCallback(async (conversation: Conversation) => {
    setActiveConversation(conversation);
    joinConversation(conversation._id);
    await fetchMessages(conversation._id);

    // Marquer les messages non lus comme lus
    const unreadMessageIds = messages
      .filter(msg => !msg.read && msg.sender._id !== currentUser._id)
      .map(msg => msg._id);

    if (unreadMessageIds.length > 0) {
      markAsRead(unreadMessageIds);
    }
  }, [joinConversation, fetchMessages, markAsRead, messages, currentUser._id]);

  // Démarrer une nouvelle conversation
  const handleStartConversation = useCallback(async (participantId: string) => {
    try {
      const conversation = await startConversation(participantId);
      await selectConversation(conversation);
    } catch (err) {
      console.error('Erreur lors de la création de la conversation:', err);
    }
  }, [startConversation, selectConversation]);

  // Envoyer un message
  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim() || !activeConversation) return;

    const recipient = activeConversation.participants.find(p => p._id !== currentUser._id);
    if (!recipient) return;

    sendMessage(messageInput.trim(), activeConversation._id, recipient._id);
    setMessageInput('');

    // Arrêter la frappe
    if (isTyping) {
      setIsTyping(false);
      stopTyping(activeConversation._id, recipient._id);
    }
  }, [messageInput, activeConversation, currentUser._id, sendMessage, isTyping, stopTyping]);

  // Gérer l'appui sur Entrée
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Filtrer les conversations
  const filteredConversations = conversations.filter(conv => {
    const otherParticipant = conv.participants.find(p => p._id !== currentUser._id);
    if (!otherParticipant) return false;

    const fullName = `${otherParticipant.firstName} ${otherParticipant.lastName}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  return (
    <div className={`flex h-screen bg-gray-100 ${className}`}>
      {/* Liste des conversations */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Messages</h2>
          <div className="mt-2">
            <input
              type="text"
              placeholder="Rechercher une conversation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Statut de connexion */}
        <div className={`px-4 py-2 text-sm ${isConnected ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
          {isConnected ? '🟢 Connecté' : '🔴 Déconnecté'}
        </div>

        {/* Liste des conversations */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              {searchTerm ? 'Aucune conversation trouvée' : 'Aucune conversation'}
            </div>
          ) : (
            filteredConversations.map((conversation) => {
              const otherParticipant = conversation.participants.find(p => p._id !== currentUser._id);
              if (!otherParticipant) return null;

              return (
                <div
                  key={conversation._id}
                  onClick={() => selectConversation(conversation)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                    activeConversation?._id === conversation._id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                      {otherParticipant.profilePhoto ? (
                        <img
                          src={otherParticipant.profilePhoto}
                          alt={`${otherParticipant.firstName} ${otherParticipant.lastName}`}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-600 font-semibold">
                          {otherParticipant.firstName[0]}{otherParticipant.lastName[0]}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {otherParticipant.firstName} {otherParticipant.lastName}
                        </h3>
                        {conversation.lastMessage && (
                          <span className="text-xs text-gray-500">
                            {new Date(conversation.lastMessage.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500 truncate">
                          {conversation.lastMessage?.content || 'Nouvelle conversation'}
                        </p>
                        {conversation.unreadCount && conversation.unreadCount > 0 && (
                          <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue-500 rounded-full">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Zone de chat */}
      <div className="flex-1 flex flex-col">
        {activeConversation ? (
          <>
            {/* Header de la conversation */}
            <div className="bg-white border-b border-gray-200 p-4">
              {(() => {
                const otherParticipant = activeConversation.participants.find(p => p._id !== currentUser._id);
                return otherParticipant ? (
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                      {otherParticipant.profilePhoto ? (
                        <img
                          src={otherParticipant.profilePhoto}
                          alt={`${otherParticipant.firstName} ${otherParticipant.lastName}`}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-600 font-semibold">
                          {otherParticipant.firstName[0]}{otherParticipant.lastName[0]}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">
                        {otherParticipant.firstName} {otherParticipant.lastName}
                      </h3>
                      <p className="text-sm text-gray-500 capitalize">{otherParticipant.role.toLowerCase()}</p>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message._id}
                  className={`flex ${message.sender._id === currentUser._id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender._id === currentUser._id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    {message.messageType === 'image' && message.fileUrl && (
                      <img
                        src={message.fileUrl}
                        alt={message.fileName}
                        className="max-w-full rounded mb-2"
                      />
                    )}
                    {message.messageType === 'file' && message.fileUrl && (
                      <a
                        href={message.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-300 underline"
                      >
                        📎 {message.fileName}
                      </a>
                    )}
                    {message.content && (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs opacity-70">
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {message.sender._id === currentUser._id && (
                        <span className="text-xs opacity-70">
                          {message.read ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Zone de saisie */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex space-x-2">
                <textarea
                  value={messageInput}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Tapez votre message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={1}
                  style={{ minHeight: '40px', maxHeight: '120px' }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || !isConnected}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Envoyer
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-50">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                💬
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Sélectionnez une conversation
              </h3>
              <p className="text-gray-500">
                Choisissez une conversation existante ou démarrez-en une nouvelle
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Gestion des erreurs */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
};

export default Chat;

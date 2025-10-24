import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Send } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';
import { API_URL } from '@/config/api';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
}

export default function ChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const socketRef = useRef<any>(null);
  const [recipientId, setRecipientId] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<any>(null);
  const [isOnline, setIsOnline] = useState(false);
  const lastActivityRef = useRef<number>(0);

  useEffect(() => {
    initializeChat();
    return () => {
      if (socketRef.current) {
        try {
          socketRef.current.emit('leave_conversation', String(id));
          socketRef.current.disconnect();
        } catch {}
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [id]);

  const initializeChat = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      // Récupérer la liste des conversations pour identifier le correspondant
      const convRes = await fetch(`${API_URL}/api/messages/conversations`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (convRes.ok) {
        const convData = await convRes.json();
        const current = (convData.data || []).find((c: any) => String(c._id || c.id) === String(id));
        if (current) {
          const other = (current.participants || []).find((p: any) => (p._id || p.id) !== profile?.id);
          setRecipientId(other?._id || other?.id || '');
          setRecipientName(other ? `${other.firstName || ''} ${other.lastName || ''}`.trim() : `Conversation #${id}`);
        }
      }

      // Charger les messages de la conversation
      const res = await fetch(`${API_URL}/api/messages/conversations/${id}/messages`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) {
        const data = await res.json();
        const mapped: Message[] = (data.data || []).map((m: any) => ({
          id: m._id || m.id,
          senderId: m.sender?._id || m.senderId,
          senderName: m.sender ? `${m.sender.firstName || ''} ${m.sender.lastName || ''}`.trim() : 'Utilisateur',
          content: m.content,
          timestamp: m.createdAt || new Date().toISOString(),
          isOwn: (m.sender?._id || m.senderId) === profile?.id,
        }));
        setMessages(mapped);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 50);
      }

      // Ouvrir Socket.IO
      if (token) {
        const socket = io(API_URL.replace('/api', ''), { auth: { token } });
        socketRef.current = socket;
        socket.on('connect', () => {
          socket.emit('join_conversation', String(id));
        });
        socket.on('new_message', (payload: any) => {
          if (String(payload.conversationId) !== String(id)) return;
          const m = payload.message;
          const msg: Message = {
            id: m._id || m.id || String(Date.now()),
            senderId: m.sender?._id || m.senderId,
            senderName: m.sender ? `${m.sender.firstName || ''} ${m.sender.lastName || ''}`.trim() : 'Utilisateur',
            content: m.content,
            timestamp: m.createdAt || new Date().toISOString(),
            isOwn: (m.sender?._id || m.senderId) === profile?.id,
          };
          setMessages((prev) => [...prev, msg]);
          lastActivityRef.current = Date.now();
          setIsOnline(true);
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
        });
        socket.on('user_typing', (data: any) => {
          if (String(data.conversationId) !== String(id)) return;
          if (data.isTyping) {
            setIsTyping(true);
            lastActivityRef.current = Date.now();
            setIsOnline(true);
          } else {
            setIsTyping(false);
          }
        });
        socket.on('conversation_updated', (data: any) => {
          if (String(data.conversationId) !== String(id)) return;
          lastActivityRef.current = Date.now();
          setIsOnline(true);
        });

        // Ticker simple pour estimer le statut en ligne (activité < 60s)
        const interval = setInterval(() => {
          const last = lastActivityRef.current;
          if (!last) return setIsOnline(false);
          setIsOnline(Date.now() - last < 60000);
        }, 5000);
        socketRef.current._presenceInterval = interval;
      }
    } catch (error) {
      // noop
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    const content = newMessage.trim();
    setNewMessage('');
    // Envoi en temps réel via socket si dispo
    if (socketRef.current && recipientId) {
      socketRef.current.emit('send_message', {
        conversationId: String(id),
        recipientId,
        content,
        messageType: 'text',
      });
    } else {
      // Fallback: ajout local
      const message: Message = {
        id: Date.now().toString(),
        senderId: profile?.id || '',
        senderName: `${profile?.first_name} ${profile?.last_name}`,
        content,
        timestamp: new Date().toISOString(),
        isOwn: true,
      };
      setMessages((prev) => [...prev, message]);
    }
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
  };

  // Gestion de l'indicateur de frappe
  const onChangeText = (text: string) => {
    setNewMessage(text);
    if (!socketRef.current || !recipientId) return;
    try {
      socketRef.current.emit('typing_start', { conversationId: String(id), recipientId });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit('typing_stop', { conversationId: String(id), recipientId });
      }, 1500);
    } catch {}
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageContainer,
        item.isOwn ? styles.ownMessage : styles.otherMessage,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          item.isOwn ? styles.ownBubble : styles.otherBubble,
        ]}
      >
        {!item.isOwn && (
          <Text style={styles.senderName}>{item.senderName}</Text>
        )}
        <Text
          style={[
            styles.messageText,
            item.isOwn ? styles.ownMessageText : styles.otherMessageText,
          ]}
        >
          {item.content}
        </Text>
        <Text
          style={[
            styles.messageTime,
            item.isOwn ? styles.ownMessageTime : styles.otherMessageTime,
          ]}
        >
          {formatTime(item.timestamp)}
        </Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{recipientName || `Conversation #${id}`}</Text>
          <Text style={[styles.headerSubtitle, { color: isOnline ? '#34C759' : '#999' }]}>{isOnline ? 'En ligne' : 'Hors ligne'}</Text>
          {isTyping && (
            <Text style={{ fontSize: 11, color: '#666', marginTop: 2 }}>L'utilisateur est en train d'écrire…</Text>
          )}
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Messages List */}
      {messages.length > 0 ? (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Aucun message pour le moment
          </Text>
          <Text style={styles.emptySubtext}>
            Commencez la conversation ci-dessous
          </Text>
        </View>
      )}

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Tapez votre message..."
          value={newMessage}
          onChangeText={onChangeText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            !newMessage.trim() && styles.sendButtonDisabled,
          ]}
          onPress={handleSendMessage}
          disabled={!newMessage.trim()}
        >
          <Send
            size={20}
            color={newMessage.trim() ? '#FFFFFF' : '#CCCCCC'}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#34C759',
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 16,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  ownBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#000',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherMessageTime: {
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#F0F0F0',
  },
});

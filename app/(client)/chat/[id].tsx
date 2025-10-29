import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Keyboard,
  Platform,
  SafeAreaView,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Send } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io, Socket } from 'socket.io-client';

import { API_URL } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useClientTheme } from '@/contexts/ClientThemeContext';
import type { ClientThemeColors } from '@/contexts/ClientThemeContext';

type ChatMessage = {
  id: string;
  senderId: string;
  senderName?: string;
  content: string;
  createdAt: string;
  isOwn: boolean;
};

export default function ClientChatScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors } = useClientTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const sendIconColor = colors.accentContrast;
  const sendIconDisabled = colors.textSecondary;
  const placeholderColor = colors.textSecondary;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [peerName, setPeerName] = useState('');
  const [peerUserId, setPeerUserId] = useState<string | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadConversationMeta();
    loadHistory();
  }, [conversationId]);

  useEffect(() => {
    if (socketRef.current && peerUserId) {
      socketRef.current.emit('get_presence', { userId: peerUserId });
    }
  }, [peerUserId]);

  useEffect(() => {
    let active = true;

    (async () => {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      const socket = io(API_URL.replace('/api', ''), {
        auth: { token },
        transports: ['websocket'],
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('join_conversation', { conversationId });
        if (peerUserId) {
          socket.emit('get_presence', { userId: peerUserId });
        }
      });

      socket.on('new_message', (payload: any) => {
        if (payload.conversationId !== conversationId) return;
        setMessages((prev) => [
          ...prev,
          {
            id: payload.message._id || payload.message.id,
            senderId: payload.message.sender?._id || payload.message.sender || '',
            senderName: `${payload.message.sender?.firstName || ''} ${payload.message.sender?.lastName || ''}`.trim(),
            content: payload.message.content,
            createdAt: payload.message.createdAt,
            isOwn: String(payload.message.sender?._id || payload.message.sender) === String(profile?.id),
          },
        ]);
      });

      socket.on('user_typing', (payload: any) => {
        if (payload.conversationId !== conversationId) return;
        setIsTyping(!!payload.isTyping);
      });

      socket.on('presence', (payload: any) => {
        if (!peerUserId) return;
        if (String(payload.userId) === String(peerUserId)) setOnline(!!payload.online);
      });

      socket.on('user_online', (payload: any) => {
        if (!peerUserId) return;
        if (String(payload.userId) === String(peerUserId)) setOnline(true);
      });

      socket.on('user_offline', (payload: any) => {
        if (!peerUserId) return;
        if (String(payload.userId) === String(peerUserId)) setOnline(false);
      });

      if (!active) socket.disconnect();
    })();

    return () => {
      active = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [conversationId, peerUserId, profile?.id]);

  const loadConversationMeta = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const res = await fetch(`${API_URL}/api/messages/conversations`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      const conversation = (data?.data || []).find((c: any) => (c._id || c.id) === conversationId);
      if (conversation) {
        const other = (conversation.participants || []).find(
          (participant: any) => (participant._id || participant.id) !== profile?.id,
        ) || {};
        setPeerName(
          other.firstName ? `${other.firstName} ${other.lastName || ''}`.trim() : 'Discussion',
        );
        setPeerUserId(other._id || other.id || null);
      }
    } catch (error) {
      console.warn('Unable to load conversation metadata', error);
    }
  };

  const loadHistory = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const res = await fetch(`${API_URL}/api/messages/conversations/${conversationId}/messages`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      const history: ChatMessage[] = (data.data || []).map((message: any) => ({
        id: message._id || message.id,
        senderId: message.sender?._id || message.sender || '',
        senderName: `${message.sender?.firstName || ''} ${message.sender?.lastName || ''}`.trim(),
        content: message.content,
        createdAt: message.createdAt,
        isOwn: String(message.sender?._id || message.sender) === String(profile?.id),
      }));
      setMessages(history);
    } catch (error) {
      console.warn('Unable to load conversation history', error);
    }
  };

  const onChangeText = (value: string) => {
    setInput(value);
    if (!socketRef.current || !peerUserId) return;

    socketRef.current.emit('typing_start', {
      conversationId,
      recipientId: peerUserId,
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('typing_stop', {
        conversationId,
        recipientId: peerUserId,
      });
    }, 1200);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !socketRef.current) return;

    socketRef.current.emit('send_message', {
      conversationId,
      content: text,
      recipientId: peerUserId,
      messageType: 'text',
    });

    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        senderId: String(profile?.id || ''),
        content: text,
        createdAt: new Date().toISOString(),
        isOwn: true,
      },
    ]);

    setInput('');
  };

  const headerStatus = useMemo(() => {
    if (online === null) return '';
    return online ? 'En ligne' : 'Hors ligne';
  }, [online]);

  const renderItem = ({ item }: { item: ChatMessage }) => (
    <View style={[styles.message, item.isOwn ? styles.messageOwn : styles.messageOther]}>
      <Text style={[styles.messageText, item.isOwn && styles.messageTextOwn]}>{item.content}</Text>
      <Text style={styles.messageTime}>
        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.select({ ios: 90, android: 0 })}
      >
        <View style={{ flex: 1 }}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <ArrowLeft color={colors.textPrimary} size={22} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{peerName || 'Discussion'}</Text>
              {!!headerStatus && (
                <Text style={styles.subtitle}>
                  {headerStatus}
                  {isTyping ? ' • écrit…' : ''}
                </Text>
              )}
            </View>
          </View>

          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
          />
        </View>

        <View
          style={[
            styles.inputBar,
            {
              paddingBottom: insets.bottom,
            },
          ]}
        >
          <TextInput
            style={styles.input}
            placeholder="Votre message"
            value={input}
            onChangeText={onChangeText}
            multiline
            autoFocus
            textAlignVertical="top"
            placeholderTextColor={placeholderColor}
            returnKeyType="send"
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={!input.trim()}>
            <Send color={input.trim() ? sendIconColor : sendIconDisabled} size={18} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ClientThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 28,
      paddingBottom: 6,
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 3,
    },
    backBtn: { padding: 6, marginRight: 10 },
    title: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
    subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    message: {
      maxWidth: '82%',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 14,
      marginVertical: 4,
      borderWidth: 1,
    },
    messageOwn: {
      alignSelf: 'flex-end',
      backgroundColor: colors.accent,
      borderBottomRightRadius: 4,
      borderColor: 'transparent',
    },
    messageOther: {
      alignSelf: 'flex-start',
      backgroundColor: colors.surfaceAlt,
      borderBottomLeftRadius: 4,
      borderColor: colors.cardBorder,
    },
    messageText: { fontSize: 15, color: colors.textPrimary },
    messageTextOwn: { color: colors.accentContrast },
    messageTime: { fontSize: 10, color: colors.textSecondary, marginTop: 4, textAlign: 'right' },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 8,
      paddingHorizontal: 12,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 8,
    },
    input: {
      flex: 1,
      minHeight: 42,
      maxHeight: 140,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 8,
      color: colors.textPrimary,
    },
    sendBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.24,
      shadowRadius: 8,
      elevation: 4,
    },
  });

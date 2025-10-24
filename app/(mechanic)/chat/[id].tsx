import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Send } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { io, Socket } from 'socket.io-client';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName?: string;
  content: string;
  createdAt: string;
  isOwn: boolean;
}

export default function MechanicChatScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [peerName, setPeerName] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [online, setOnline] = useState<boolean | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadHeader();
    loadHistory();
  }, [conversationId]);

  useEffect(() => {
    let active = true;
    (async () => {
      const token = await AsyncStorage.getItem('authToken');
      const base = API_URL.replace('/api', '');
      const s = io(base, { auth: { token } });
      socketRef.current = s;

      s.on('connect', () => {
        s.emit('join_conversation', { conversationId });
        if (peerUserId) {
          s.emit('get_presence', { userId: peerUserId });
        }
      });

      s.on('new_message', (data: any) => {
        if (data.conversationId !== conversationId) return;
        setMessages(prev => [
          ...prev,
          {
            id: data.message._id || data.message.id,
            senderId: data.message.sender?._id || data.message.sender || '',
            senderName: `${data.message.sender?.firstName || ''} ${data.message.sender?.lastName || ''}`.trim(),
            content: data.message.content,
            createdAt: data.message.createdAt,
            isOwn: String(data.message.sender?._id || data.message.sender) === String(profile?.id),
          },
        ]);
      });

      s.on('user_typing', (p: any) => {
        if (p.conversationId !== conversationId) return;
        setIsTyping(!!p.isTyping);
      });

      s.on('presence', (p: any) => {
        if (!peerUserId) return;
        if (String(p.userId) === String(peerUserId)) setOnline(!!p.online);
      });

      s.on('user_online', (p: any) => {
        if (!peerUserId) return;
        if (String(p.userId) === String(peerUserId)) setOnline(true);
      });
      s.on('user_offline', (p: any) => {
        if (!peerUserId) return;
        if (String(p.userId) === String(peerUserId)) setOnline(false);
      });

      if (!active) s.disconnect();
    })();
    return () => {
      active = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [conversationId, profile?.id, peerName]);

  const [peerUserId, setPeerUserId] = useState<string | null>(null);

  const loadHeader = async () => {
    const token = await AsyncStorage.getItem('authToken');
    const res = await fetch(`${API_URL}/api/messages/conversations`, {
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) return;
    const data = await res.json();
    const conv = (data.data || []).find((c: any) => (c._id || c.id) === conversationId);
    if (conv) {
      const other = (conv.participants || []).find((p: any) => (p._id || p.id) !== profile?.id) || {};
      setPeerName(other.firstName ? `${other.firstName} ${other.lastName || ''}`.trim() : 'Discussion');
      setPeerUserId(other._id || other.id || null);
    }
  };

  const loadHistory = async () => {
    const token = await AsyncStorage.getItem('authToken');
    const res = await fetch(`${API_URL}/api/messages/conversations/${conversationId}/messages`, {
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) return;
    const data = await res.json();
    const list: ChatMessage[] = (data.data || []).map((m: any) => ({
      id: m._id || m.id,
      senderId: m.sender?._id || m.sender || '',
      senderName: `${m.sender?.firstName || ''} ${m.sender?.lastName || ''}`.trim(),
      content: m.content,
      createdAt: m.createdAt,
      isOwn: String(m.sender?._id || m.sender) === String(profile?.id),
    }));
    setMessages(list);
  };

  const onChangeText = (t: string) => {
    setInput(t);
    if (!socketRef.current || !peerUserId) return;
    socketRef.current.emit('typing_start', { conversationId, recipientId: peerUserId });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('typing_stop', { conversationId, recipientId: peerUserId });
    }, 1200);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !socketRef.current) return;
    const token = await AsyncStorage.getItem('authToken');
    socketRef.current.emit('send_message', {
      conversationId,
      content: text,
      recipientId: peerUserId,
      messageType: 'text',
    });
    setMessages(prev => [
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
    <View style={[styles.msg, item.isOwn ? styles.msgOwn : styles.msgOther]}>
      <Text style={[styles.msgText, item.isOwn ? { color: '#fff' } : { color: '#111' }]}>{item.content}</Text>
      <Text style={styles.msgTime}>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color="#0A1F44" size={22} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{peerName || 'Discussion'}</Text>
          {!!headerStatus && <Text style={styles.subtitle}>{headerStatus}{isTyping ? ' • écrit…' : ''}</Text>}
        </View>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        style={{ flex: 1 }}
        onContentSizeChange={() => {}}
      />

      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })}>
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Votre message"
            value={input}
            onChangeText={onChangeText}
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={!input.trim()}>
            <Send color={input.trim() ? '#fff' : '#bbb'} size={18} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingTop: 50, paddingBottom: 12, paddingHorizontal: 16, backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  backBtn: { padding: 6, marginRight: 10 },
  title: { fontSize: 16, fontWeight: '700', color: '#0A1F44' },
  subtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  msg: { maxWidth: '82%', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, marginVertical: 4 },
  msgOwn: { alignSelf: 'flex-end', backgroundColor: '#0A1F44', borderBottomRightRadius: 4 },
  msgOther: { alignSelf: 'flex-start', backgroundColor: '#F1F5F9', borderBottomLeftRadius: 4 },
  msgText: { fontSize: 15 },
  msgTime: { fontSize: 10, color: '#9CA3AF', marginTop: 4, textAlign: 'right' },
  inputBar: { flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: '#F9FAFB', borderTopWidth: 1, borderTopColor: '#EEE' },
  input: { flex: 1, minHeight: 40, maxHeight: 120, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A1F44' },
});

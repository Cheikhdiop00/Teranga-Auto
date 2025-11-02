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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Send, Play, Pause, Mic, StopCircle } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io, Socket } from 'socket.io-client';

import { API_URL } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useClientTheme } from '@/contexts/ClientThemeContext';
import type { ClientThemeColors } from '@/contexts/ClientThemeContext';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as FileSystem from 'expo-file-system';

type ChatMessage = {
  id: string;
  senderId: string;
  senderName?: string;
  content: string;
  createdAt: string;
  isOwn: boolean;
  messageType?: 'text' | 'image' | 'file' | 'audio';
  fileUrl?: string;
  audioDurationMs?: number;
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
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
            messageType: payload.message.messageType,
            fileUrl: payload.message.fileUrl,
            audioDurationMs: payload.message.audioDurationMs,
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
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
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
        messageType: message.messageType,
        fileUrl: message.fileUrl,
        audioDurationMs: message.audioDurationMs,
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
    if (!text || !socketRef.current || isRecording || isUploadingAudio) return;

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
        messageType: 'text',
      },
    ]);

    setInput('');
  };

  const requestAudioPermissions = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Autorisez l’accès au micro pour envoyer un message vocal.');
      return false;
    }
    return true;
  };

  const clearRecordingTimer = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  const handleStartRecording = async () => {
    if (isRecording || isUploadingAudio) return;
    if (!(await requestAudioPermissions())) return;
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setRecordingDurationMs(0);
      setIsRecording(true);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDurationMs(prev => prev + 500);
      }, 500);
    } catch (error) {
      console.error('Unable to start recording', error);
      Alert.alert('Erreur', 'Impossible de démarrer l’enregistrement audio.');
      setIsRecording(false);
      clearRecordingTimer();
    }
  };

  const handleCancelRecording = async () => {
    clearRecordingTimer();
    setIsRecording(false);
    setRecordingDurationMs(0);
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {
        // ignore
      }
      recordingRef.current = null;
    }
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    } catch {
      // noop
    }
  };

  const uploadAudioAndSend = async (uri: string, durationMs: number) => {
    try {
      if (!socketRef.current || !peerUserId) {
        Alert.alert('Erreur', 'Conversation indisponible.');
        return;
      }
      setIsUploadingAudio(true);
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      const payload = {
        base64: `data:audio/m4a;base64,${base64}`,
        audioDurationMs: durationMs,
      };
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/upload/audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.message || 'Upload audio échoué');
      }
      const data = await response.json();
      const audioUrl = data.url;
      const serverDuration = Number(data.audioDurationMs);
      const finalDuration = Number.isFinite(serverDuration) ? serverDuration : durationMs;

      socketRef.current.emit('send_message', {
        conversationId,
        content: '[audio]',
        recipientId: peerUserId,
        messageType: 'audio',
        fileUrl: audioUrl,
        audioDurationMs: finalDuration,
      });

      setMessages(prev => [
        ...prev,
        {
          id: String(Date.now()),
          senderId: String(profile?.id || ''),
          content: '[audio]',
          createdAt: new Date().toISOString(),
          isOwn: true,
          messageType: 'audio',
          fileUrl: audioUrl,
          audioDurationMs: finalDuration,
        },
      ]);
    } catch (error: any) {
      console.error('Audio upload failed', error);
      Alert.alert('Erreur', error?.message || 'Impossible d’envoyer le message audio.');
    } finally {
      setIsUploadingAudio(false);
      try {
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      } catch {
        // noop
      }
    }
  };

  const handleStopRecording = async () => {
    if (!recordingRef.current) return;
    clearRecordingTimer();
    const activeRecording = recordingRef.current;
    recordingRef.current = null;
    setIsRecording(false);
    try {
      await activeRecording.stopAndUnloadAsync();
    } catch (error) {
      console.error('Unable to stop recording', error);
    }
    const status = await activeRecording.getStatusAsync();
    const durationMs = status?.durationMillis ?? recordingDurationMs;
    if (!durationMs || durationMs < 700) {
      Alert.alert('Audio trop court', 'Enregistrez au moins une seconde.');
      return;
    }
    const uri = activeRecording.getURI();
    if (!uri) {
      Alert.alert('Erreur', 'Impossible de récupérer le fichier audio.');
      return;
    }
    await uploadAudioAndSend(uri, durationMs);
  };

  const headerStatus = useMemo(() => {
    if (online === null) return '';
    return online ? 'En ligne' : 'Hors ligne';
  }, [online]);

  const renderItem = ({ item }: { item: ChatMessage }) => (
    item.messageType === 'audio' && item.fileUrl ? (
      <AudioMessageBubble
        uri={item.fileUrl}
        durationMs={item.audioDurationMs}
        isOwn={item.isOwn}
        colors={colors}
        styles={styles}
      />
    ) : (
      <View style={[styles.message, item.isOwn ? styles.messageOwn : styles.messageOther]}>
        <Text style={[styles.messageText, item.isOwn && styles.messageTextOwn]}>{item.content}</Text>
        <Text style={styles.messageTime}>
          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    )
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

        <View style={[styles.inputWrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.inputBar}>
            <TouchableOpacity
              style={[styles.micButton, isRecording && styles.micButtonActive]}
              onPress={isRecording ? handleStopRecording : handleStartRecording}
              disabled={isUploadingAudio || (!isRecording && !peerUserId)}
            >
              {isRecording ? <StopCircle color={colors.surface} size={20} /> : <Mic color={colors.accent} size={20} />}
            </TouchableOpacity>
            {isRecording ? (
              <TouchableOpacity style={styles.recordingIndicator} onPress={handleCancelRecording}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingTime}>{formatDuration(recordingDurationMs)}</Text>
                <Text style={styles.recordingCancel}>Annuler</Text>
              </TouchableOpacity>
            ) : (
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
                editable={!isUploadingAudio}
              />
            )}
            <TouchableOpacity
              style={[styles.sendBtn, (isRecording || isUploadingAudio || !input.trim()) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={isRecording || isUploadingAudio || !input.trim()}
            >
              {isUploadingAudio ? (
                <ActivityIndicator size="small" color={colors.accentContrast} />
              ) : (
                <Send color={input.trim() ? sendIconColor : sendIconDisabled} size={18} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type AudioMessageBubbleProps = {
  uri: string;
  durationMs?: number;
  isOwn: boolean;
  colors: ClientThemeColors;
  styles: ReturnType<typeof createStyles>;
};

function AudioMessageBubble({ uri, durationMs, isOwn, colors, styles }: AudioMessageBubbleProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progressMs, setProgressMs] = useState(0);
  const total = durationMs ?? 0;

  useEffect(() => {
    return () => {
      if (sound) sound.unloadAsync().catch(() => undefined);
    };
  }, [sound]);

  const onPlaybackStatus = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setProgressMs(status.positionMillis ?? 0);
    if (status.didJustFinish) {
      setIsPlaying(false);
      setProgressMs(0);
    }
  };

  const handleToggle = async () => {
    try {
      if (isPlaying) {
        await sound?.pauseAsync();
        setIsPlaying(false);
        return;
      }
      if (!sound) {
        const { sound: newSound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
        setSound(newSound);
        newSound.setOnPlaybackStatusUpdate(onPlaybackStatus);
        setIsPlaying(true);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Unable to play audio message', error);
    }
  };

  const progressRatio = total > 0 ? Math.min(progressMs / total, 1) : 0;
  const progressColor = isOwn ? colors.accentContrast : colors.accent;
  const bubbleStyles = [styles.message, isOwn ? styles.messageOwn : styles.messageOther];

  return (
    <View style={[...bubbleStyles, styles.audioBubble]}>
      <TouchableOpacity style={[styles.audioPlayButton, { backgroundColor: isOwn ? colors.accentContrast : colors.accent }]} onPress={handleToggle}>
        {isPlaying ? <Pause color={isOwn ? colors.accent : colors.accentContrast} size={18} /> : <Play color={isOwn ? colors.accent : colors.accentContrast} size={18} />}
      </TouchableOpacity>
      <View style={styles.audioProgressWrapper}>
        <View style={[styles.audioProgressTrack, { backgroundColor: isOwn ? '#ffffff55' : '#00000015' }]}
        >
          <View style={[styles.audioProgressFill, { flex: progressRatio, backgroundColor: progressColor }]} />
          <View style={{ flex: 1 - progressRatio }} />
        </View>
        <Text style={[styles.messageTime, { marginTop: 6 }]}>
          {formatDuration(isPlaying ? progressMs : total)}
        </Text>
      </View>
    </View>
  );
}

function formatDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
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
    inputWrapper: {
      paddingHorizontal: 12,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingTop: 8,
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
    sendBtnDisabled: {
      backgroundColor: colors.cardBorder,
    },
    micButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    micButtonActive: {
      backgroundColor: '#DC2626',
      borderColor: '#DC2626',
    },
    recordingIndicator: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#FEE2E2',
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    recordingDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#DC2626',
    },
    recordingTime: {
      fontWeight: '600',
      color: '#991B1B',
    },
    recordingCancel: {
      marginLeft: 'auto',
      color: '#DC2626',
      fontWeight: '500',
      textDecorationLine: 'underline',
    },
    audioBubble: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    audioPlayButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    audioProgressWrapper: { flex: 1 },
    audioProgressTrack: {
      flexDirection: 'row',
      height: 4,
      borderRadius: 4,
      overflow: 'hidden',
    },
    audioProgressFill: {},
  });

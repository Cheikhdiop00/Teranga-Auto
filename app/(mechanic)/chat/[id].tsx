import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Send, Mic, StopCircle, Play, Pause } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { io, Socket } from 'socket.io-client';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName?: string;
  content: string;
  createdAt: string;
  isOwn: boolean;
  messageType?: 'text' | 'image' | 'file' | 'audio';
  fileUrl?: string;
  audioDurationMs?: number;
}

export default function MechanicChatScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [peerName, setPeerName] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [online, setOnline] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);

  type TimeoutHandle = ReturnType<typeof setTimeout>;
  type IntervalHandle = ReturnType<typeof setInterval>;

  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<TimeoutHandle | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingIntervalRef = useRef<IntervalHandle | null>(null);

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
            messageType: data.message.messageType,
            fileUrl: data.message.fileUrl,
            audioDurationMs: data.message.audioDurationMs,
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
      messageType: m.messageType,
      fileUrl: m.fileUrl,
      audioDurationMs: m.audioDurationMs,
    }));
    setMessages(list);
  };

  const onChangeText = (text: string) => {
    setInput(text);
    if (!socketRef.current || !peerUserId) return;
    socketRef.current.emit('typing_start', { conversationId, recipientId: peerUserId });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('typing_stop', { conversationId, recipientId: peerUserId });
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

    setMessages(prev => [
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
      Alert.alert('Permission requise', 'Autorisez l’accès au microphone pour envoyer un message vocal.');
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
      console.error('Start recording failed', error);
      Alert.alert('Erreur', 'Impossible de démarrer l’enregistrement audio.');
      setIsRecording(false);
      clearRecordingTimer();
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
      Alert.alert('Erreur', error?.message || 'Impossible d’envoyer l’audio.');
    } finally {
      setIsUploadingAudio(false);
      try {
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      } catch {
        /* noop */
      }
    }
  };

  const handleStopRecording = async () => {
    if (!recordingRef.current) return;
    clearRecordingTimer();
    const currentRecording = recordingRef.current;
    recordingRef.current = null;
    setIsRecording(false);
    try {
      await currentRecording.stopAndUnloadAsync();
    } catch (error) {
      console.error('Stop recording failed', error);
    }
    const status = await currentRecording.getStatusAsync();
    const durationMs = status?.durationMillis ?? recordingDurationMs;
    if (!durationMs || durationMs < 700) {
      Alert.alert('Audio trop court', 'Enregistrez au moins une seconde.');
      return;
    }
    const uri = currentRecording.getURI();
    if (!uri) {
      Alert.alert('Erreur', 'Aucun fichier audio trouvé.');
      return;
    }
    await uploadAudioAndSend(uri, durationMs);
  };

  const handleCancelRecording = async () => {
    clearRecordingTimer();
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {
        /* ignore */
      }
      recordingRef.current = null;
    }
    setIsRecording(false);
    setRecordingDurationMs(0);
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    } catch {
      /* noop */
    }
  };

  const headerStatus = useMemo(() => {
    if (online === null) return '';
    return online ? 'En ligne' : 'Hors ligne';
  }, [online]);

  const renderItem = ({ item }: { item: ChatMessage }) => (
    item.messageType === 'audio' && item.fileUrl ? (
      <AudioMessageBubble
        uri={item.fileUrl}
        isOwn={item.isOwn}
        durationMs={item.audioDurationMs}
      />
    ) : (
      <View style={[styles.msg, item.isOwn ? styles.msgOwn : styles.msgOther]}>
        <Text style={[styles.msgText, item.isOwn ? { color: '#fff' } : { color: '#111' }]}>{item.content}</Text>
        <Text style={styles.msgTime}>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
      </View>
    )
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
        <View style={[styles.inputWrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}> 
          <View style={styles.inputBar}>
          <TouchableOpacity
            style={[styles.micButton, isRecording && styles.micButtonActive]}
            onPress={isRecording ? handleStopRecording : handleStartRecording}
            disabled={isUploadingAudio || (!isRecording && !peerUserId)}
          >
            {isRecording ? <StopCircle color="#fff" size={20} /> : <Mic color="#0A1F44" size={20} />}
          </TouchableOpacity>
          {isRecording ? (
            <TouchableOpacity style={styles.recordingTimerWrapper} onPress={handleCancelRecording}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingTimerText}>{formatDuration(recordingDurationMs)}</Text>
              <Text style={styles.recordingCancelText}>Annuler</Text>
            </TouchableOpacity>
          ) : (
            <TextInput
              style={styles.input}
              placeholder="Votre message"
              value={input}
              onChangeText={onChangeText}
              multiline
              editable={!isUploadingAudio}
            />
          )}
          <TouchableOpacity
            style={[styles.sendBtn, (isRecording || isUploadingAudio || !input.trim()) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={isRecording || isUploadingAudio || !input.trim()}
          >
            {isUploadingAudio ? <ActivityIndicator size="small" color="#fff" /> : <Send color={input.trim() ? '#fff' : '#bbb'} size={18} />}
          </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

type AudioMessageBubbleProps = {
  uri: string;
  isOwn: boolean;
  durationMs?: number;
};

function AudioMessageBubble({ uri, isOwn, durationMs }: AudioMessageBubbleProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progressMs, setProgressMs] = useState(0);
  const duration = durationMs ?? 0;

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync().catch(() => undefined);
      }
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

  const handleTogglePlayback = async () => {
    try {
      if (isPlaying) {
        await sound?.pauseAsync();
        setIsPlaying(false);
        return;
      }

      if (!sound) {
        const { sound: newSound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
        setSound(newSound);
        setIsPlaying(true);
        newSound.setOnPlaybackStatusUpdate(onPlaybackStatus);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Audio playback failed', error);
      Alert.alert('Lecture impossible', 'Impossible de lire ce message audio.');
    }
  };

  const ratio = duration > 0 ? Math.min(progressMs / duration, 1) : 0;

  return (
    <View style={[styles.audioMsg, isOwn ? styles.msgOwn : styles.msgOther]}>
      <TouchableOpacity style={styles.audioPlayButton} onPress={handleTogglePlayback}>
        {isPlaying ? <Pause color={isOwn ? '#fff' : '#0A1F44'} size={18} /> : <Play color={isOwn ? '#fff' : '#0A1F44'} size={18} />}
      </TouchableOpacity>
      <View style={styles.audioProgressWrapper}>
        <View style={styles.audioProgressTrack}>
          <View style={[styles.audioProgressFill, { flex: ratio }]} />
          <View style={{ flex: 1 - ratio }} />
        </View>
        <Text style={[styles.audioDuration, isOwn ? { color: '#E8ECF8' } : { color: '#1E3A8A' }]}>
          {formatDuration(isPlaying ? progressMs : duration)}
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
  inputWrapper: { paddingHorizontal: 12, backgroundColor: '#F9FAFB' },
  input: { flex: 1, minHeight: 40, maxHeight: 120, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, marginHorizontal: 8 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A1F44' },
  sendBtnDisabled: { backgroundColor: '#9CA3AF' },
  micButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0E7FF',
  },
  micButtonActive: {
    backgroundColor: '#DC2626',
  },
  recordingTimerWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
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
  recordingTimerText: {
    fontWeight: '600',
    color: '#991B1B',
  },
  recordingCancelText: {
    marginLeft: 'auto',
    color: '#DC2626',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  audioMsg: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginVertical: 4,
    maxWidth: '82%',
    gap: 12,
  },
  audioPlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0F2FE',
  },
  audioProgressWrapper: { flex: 1 },
  audioProgressTrack: {
    flexDirection: 'row',
    height: 4,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#CBD5F5',
  },
  audioProgressFill: {
    backgroundColor: '#1D4ED8',
  },
  audioDuration: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
  },
});

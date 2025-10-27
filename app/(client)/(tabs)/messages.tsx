import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Image, Alert } from 'react-native';
import { Sparkles, Send, ImagePlus, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/config/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

type ChatRole = 'user' | 'assistant';

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
}

interface PendingImage {
  uri: string;
  dataUrl: string;
}

const INITIAL_ASSISTANT_MESSAGE: ChatMessage = {
  id: 'assistant-hello',
  role: 'assistant',
  content:
    'Bonjour ! Je suis votre assistant virtuel Teranga Auto. Décrivez-moi votre panne ou posez une question sur nos services, et je vous guiderai.',
  createdAt: Date.now(),
};

export default function ClientChatbotScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_ASSISTANT_MESSAGE]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  const pickImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Images', 'Permission refusée pour accéder à vos photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        if (!asset.base64) {
          Alert.alert('Images', "Impossible de lire le contenu de cette image.");
          return;
        }

        const dataUrl = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
        setPendingImage({ uri: asset.uri, dataUrl });
      }
    } catch {
      Alert.alert('Images', 'Impossible de sélectionner une image pour le moment.');
    }
  }, []);

  const historyPayload = useMemo(
    () =>
      messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    [messages],
  );

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if ((!trimmed && !pendingImage) || isSending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed || '[Image envoyée]',
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    const imageToSend = pendingImage;
    setPendingImage(null);
    setIsSending(true);

    try {
      const token = await AsyncStorage.getItem('authToken');
      const res = await fetch(`${API_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: trimmed || 'Regardez l’image ci-jointe.',
          history: historyPayload,
          ...(imageToSend ? { image: imageToSend.dataUrl } : {}),
        }),
      });

      if (!res.ok) {
        throw new Error('Service IA indisponible');
      }

      const data = await res.json();
      const replyText: string = data?.reply ||
        "Je suis désolé, je ne parviens pas à répondre pour le moment. Merci de réessayer plus tard.";

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: replyText,
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      if (imageToSend) {
        setPendingImage(imageToSend);
      }
      const assistantMessage: ChatMessage = {
        id: `assistant-error-${Date.now()}`,
        role: 'assistant',
        content:
          "Je rencontre un souci technique pour répondre. Veuillez vérifier votre connexion ou réessayer dans quelques instants.",
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsSending(false);
    }
  }, [API_URL, historyPayload, input, isSending]);

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}>
        {!isUser && (
          <View style={styles.avatar}>
            <Sparkles size={16} color="#fff" />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.assistantText]}>{item.content}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.messagesContent, { paddingBottom: 24 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      />

      {pendingImage && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: pendingImage.uri }} style={styles.previewImage} />
          <TouchableOpacity
            style={styles.previewRemove}
            onPress={() => setPendingImage(null)}
          >
            <X size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.inputWrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}> 
        <TouchableOpacity style={styles.iconButton} onPress={pickImage}>
          <ImagePlus size={20} color="#0A1F44" />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Décrivez votre problème..."
          placeholderTextColor="#999"
          value={input}
          onChangeText={setInput}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, ((!input.trim() && !pendingImage) || isSending) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={(!input.trim() && !pendingImage) || isSending}
        >
          <Send size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7FB',
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0A1F44',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: '#0A1F44',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E6F0',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: '#fff',
  },
  assistantText: {
    color: '#0A1F44',
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E0E6F0',
  },
  previewImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  previewRemove: {
    marginLeft: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E6F0',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F1F3F6',
    borderRadius: 16,
    fontSize: 15,
    color: '#0A1F44',
    marginRight: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E8ECF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0A1F44',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#9AA5B5',
  },
});

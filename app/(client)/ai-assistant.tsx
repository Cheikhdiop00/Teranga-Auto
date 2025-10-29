import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Paperclip, Send, Sparkles } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

import { API_BASE_URL } from '@/config/api';
import { useClientTheme } from '@/contexts/ClientThemeContext';
import type { ClientThemeColors } from '@/contexts/ClientThemeContext';

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  createdAt: number;
  imageUri?: string;
};

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome',
    role: 'assistant',
    content:
      "Bonjour ! Je suis l’assistant IA de Teranga Auto. Comment puis-je vous aider aujourd’hui ?",
    createdAt: Date.now(),
  },
];

const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

const FALLBACK_ASSISTANT_REPLY =
  "Je n’arrive pas à répondre pour le moment. Veuillez réessayer dans quelques instants.";

export default function ClientAIAssistantScreen() {
  const { colors } = useClientTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ uri: string; dataUrl: string } | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollToEnd({ animated: true });
    }
  }, [messages, isTyping]);

  const handlePickImage = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Autorisation requise',
          'Merci d’autoriser l’accès à votre galerie pour envoyer une photo.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        base64: true,
        quality: 0.8,
        selectionLimit: 1,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      if (!asset.base64 || !asset.uri) {
        Alert.alert('Image indisponible', 'Impossible de récupérer la photo sélectionnée.');
        return;
      }

      const mimeType = asset.mimeType ?? 'image/jpeg';
      const dataUrl = `data:${mimeType};base64,${asset.base64}`;
      setSelectedImage({ uri: asset.uri, dataUrl });
    } catch (error) {
      console.error('Sélection image assistant IA:', error);
      Alert.alert('Erreur', 'La sélection de photo a échoué. Réessayez.');
    }
  }, []);

  const handleRemoveImage = useCallback(() => {
    setSelectedImage(null);
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = inputValue.trim();
    if ((trimmed.length === 0 && !selectedImage) || isSending) {
      return;
    }

    const hasText = trimmed.length > 0;
    const userContent = hasText ? trimmed : 'Image envoyée';
    const timestamp = Date.now();
    const userMessage: ChatMessage = {
      id: `${timestamp}`,
      role: 'user',
      content: userContent,
      createdAt: timestamp,
      imageUri: selectedImage?.uri,
    };

    const historyForApi = [...messages, userMessage].slice(-10).map((entry) => ({
      role: entry.role,
      content: entry.content,
    }));

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    setIsSending(true);

    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: hasText ? trimmed : 'Image envoyée par le client (sans texte).',
          history: historyForApi,
          image: selectedImage?.dataUrl,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      const assistantText: string =
        typeof payload?.reply === 'string' && payload.reply.trim().length > 0
          ? payload.reply.trim()
          : FALLBACK_ASSISTANT_REPLY;

      const replyTimestamp = Date.now();
      setMessages((prev) => [
        ...prev,
        {
          id: `${userMessage.id}-assistant`,
          role: 'assistant',
          content: assistantText,
          createdAt: replyTimestamp,
        },
      ]);
      setSelectedImage(null);
    } catch (error) {
      console.error('Échec appel assistant IA:', error);
      const replyTimestamp = Date.now();
      setMessages((prev) => [
        ...prev,
        {
          id: `${userMessage.id}-assistant-error`,
          role: 'assistant',
          content: FALLBACK_ASSISTANT_REPLY,
          createdAt: replyTimestamp,
        },
      ]);
    } finally {
      setIsTyping(false);
      setIsSending(false);
    }
  }, [inputValue, isSending, messages, selectedImage]);

  const sendDisabled = (inputValue.trim().length === 0 && !selectedImage) || isSending;

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerIcon}>
              <Sparkles color={colors.accent} size={20} />
            </View>
            <View style={styles.headerTextGroup}>
              <Text style={styles.headerTitle}>Assistant IA</Text>
              <Text style={styles.headerSubtitle}>
                Obtenez des conseils instantanés pour vos besoins automobiles.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.messages}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.messagesContent}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((message) => {
              const isAssistant = message.role === 'assistant';
              return (
                <View
                  key={message.id}
                  style={[
                    styles.messageRow,
                    isAssistant ? styles.messageRowAssistant : styles.messageRowUser,
                  ]}
                >
                  {isAssistant ? (
                    <View style={styles.assistantAvatar}>
                      <Sparkles color={colors.accentContrast} size={18} />
                    </View>
                  ) : null}

                  <View
                    style={[
                      styles.messageBubble,
                      isAssistant ? styles.assistantBubble : styles.userBubble,
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageBadge,
                        isAssistant ? styles.assistantBadge : styles.userBadge,
                      ]}
                    >
                      {isAssistant ? 'Assistant' : 'Vous'}
                    </Text>
                    {message.content ? (
                      <Text
                        style={[
                          styles.messageText,
                          isAssistant ? styles.assistantText : styles.userText,
                        ]}
                      >
                        {message.content}
                      </Text>
                    ) : null}
                    {message.imageUri ? (
                      <Image source={{ uri: message.imageUri }} style={styles.messageImage} />
                    ) : null}
                    <Text style={styles.messageMeta}>{formatTime(message.createdAt)}</Text>
                  </View>
                </View>
              );
            })}

            {isTyping ? (
              <View style={styles.typingRow}>
                <View style={styles.assistantAvatar}>
                  <Sparkles color={colors.accentContrast} size={18} />
                </View>
                <Text style={styles.typingLabel}>Assistant est en train d’écrire…</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>

        <View style={styles.footer}>
          <View style={styles.composerCard}>
            <View style={styles.imageAttachment}>
              <TouchableOpacity
                style={styles.imagePickerButton}
                onPress={handlePickImage}
                disabled={isSending}
                accessibilityRole="button"
                accessibilityLabel="Ajouter une photo"
                activeOpacity={0.85}
              >
                <Paperclip color={colors.accent} size={18} />
              </TouchableOpacity>
              {selectedImage ? (
                <View style={styles.imagePreviewWrapper}>
                  <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={handleRemoveImage}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.removeImageLabel}>Retirer</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
            <View style={styles.composerRow}>
              <TextInput
                style={[styles.input, styles.composerInput]}
                multiline
                placeholder="Écrivez votre message..."
                placeholderTextColor={colors.textSecondary}
                value={inputValue}
                onChangeText={setInputValue}
                accessibilityLabel="Champ de saisie du message"
              />
              <TouchableOpacity
                style={[styles.sendButton, sendDisabled && styles.sendButtonDisabled]}
                onPress={handleSend}
                disabled={sendDisabled}
                accessibilityLabel="Envoyer le message"
                activeOpacity={0.85}
              >
                <Send color={colors.accentContrast} size={20} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ClientThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      justifyContent: 'center',
      backgroundColor: colors.surface,
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTextGroup: {
      flex: 1,
      gap: 4,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    headerSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    messages: {
      flex: 1,
    },
    messagesContent: {
      paddingHorizontal: 20,
      paddingBottom: 24,
      gap: 16,
    },
    messageRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
    },
    messageRowAssistant: {
      justifyContent: 'flex-start',
    },
    messageRowUser: {
      justifyContent: 'flex-end',
    },
    assistantAvatar: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    messageBubble: {
      maxWidth: '80%',
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 14,
      gap: 8,
    },
    assistantBubble: {
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    userBubble: {
      backgroundColor: colors.accent,
    },
    messageBadge: {
      alignSelf: 'flex-start',
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 4,
      fontSize: 11,
      fontWeight: '600',
    },
    assistantBadge: {
      backgroundColor: 'rgba(0,0,0,0.08)',
      color: colors.textPrimary,
    },
    userBadge: {
      backgroundColor: 'rgba(255,255,255,0.25)',
      color: colors.accentContrast,
    },
    messageMeta: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    messageText: {
      fontSize: 14,
      lineHeight: 20,
    },
    assistantText: {
      color: colors.textPrimary,
    },
    userText: {
      color: colors.accentContrast,
    },
    messageImage: {
      width: 180,
      height: 120,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    typingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    typingLabel: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    footer: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
      paddingTop: 12,
      paddingBottom: Platform.OS === 'ios' ? 28 : 20,
      gap: 12,
    },
    composerCard: {
      marginHorizontal: 16,
      padding: 14,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 3,
    },
    composerHint: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    imageAttachment: {
      gap: 12,
    },
    imagePickerButton: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
      alignSelf: 'flex-start',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.accent,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: 'rgba(0,122,255,0.08)',
    },
    imagePickerLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.accent,
    },
    imagePreviewWrapper: {
      position: 'relative',
      alignSelf: 'flex-start',
    },
    imagePreview: {
      width: 200,
      height: 132,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    removeImageButton: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: 'rgba(0,0,0,0.4)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    removeImageLabel: {
      color: '#FFF',
      fontSize: 11,
      fontWeight: '600',
    },
    composerRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 12,
    },
    composerInput: {
      flex: 1,
      minHeight: 48,
      maxHeight: 140,
      textAlignVertical: 'top',
    },
    input: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.textPrimary,
      fontSize: 14,
    },
    sendButton: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
    },
    sendButtonDisabled: {
      opacity: 0.5,
    },
  });

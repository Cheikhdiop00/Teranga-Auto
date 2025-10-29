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
  StatusBar,
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
      <StatusBar barStyle={colors.background === '#07070B' ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 18 : 0}
      >
        <View style={styles.headerGradient}>
          <View style={styles.headerContent}>
            <View style={styles.headerIcon}>
              <Sparkles color={colors.accentContrast} size={22} />
            </View>
            <View style={styles.headerTextGroup}>
              <Text style={styles.headerTitle}>Assistant IA</Text>
              <Text style={styles.headerSubtitle}>
                Obtenez des conseils instantanés et personnalisés pour vos trajets.
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

        <View style={styles.footerSpacer} />
        <View style={styles.floatingComposerShadow}>
          <View style={styles.composerCard}>
            <View style={styles.composerAttachments}>
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
                <TouchableOpacity
                  style={styles.previewChip}
                  onPress={handleRemoveImage}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri: selectedImage.uri }} style={styles.previewThumbnail} />
                  <Text style={styles.previewLabel}>Retirer</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <View style={styles.composerRow}>
              <TextInput
                style={[styles.input, styles.composerInput]}
                multiline
                placeholder="Décrivez votre besoin..."
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
    headerGradient: {
      paddingTop: 28,
      paddingHorizontal: 20,
      paddingBottom: 16,
      backgroundColor: colors.surface,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
      elevation: 6,
    },
    headerContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerIcon: {
      width: 46,
      height: 46,
      borderRadius: 16,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: 10,
    },
    headerTextGroup: {
      flex: 1,
      gap: 4,
    },
    headerTitle: {
      fontSize: 22,
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
      paddingHorizontal: 16,
      paddingVertical: 24,
      paddingBottom: 120,
      gap: 18,
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
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    messageBubble: {
      maxWidth: '82%',
      borderRadius: 18,
      paddingVertical: 12,
      paddingHorizontal: 16,
      gap: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    assistantBubble: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    userBubble: {
      backgroundColor: colors.accent,
    },
    messageBadge: {
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      opacity: 0.8,
    },
    assistantBadge: {
      color: colors.accent,
    },
    userBadge: {
      color: colors.accentContrast,
    },
    messageText: {
      fontSize: 15,
      lineHeight: 22,
    },
    assistantText: {
      color: colors.textPrimary,
    },
    userText: {
      color: colors.accentContrast,
    },
    messageMeta: {
      fontSize: 12,
      color: colors.textSecondary,
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
      gap: 12,
      marginTop: 6,
    },
    typingLabel: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    footerSpacer: {
      height: 86,
    },
    floatingComposerShadow: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 20,
      paddingHorizontal: 16,
      zIndex: 10,
    },
    composerCard: {
      borderRadius: 22,
      backgroundColor: colors.surface,
      padding: 14,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#111827',
      shadowOpacity: 0.18,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 12 },
      elevation: 8,
    },
    composerAttachments: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    imagePickerButton: {
      width: 40,
      height: 40,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
    },
    previewChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.surfaceAlt,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    previewThumbnail: {
      width: 32,
      height: 32,
      borderRadius: 10,
    },
    previewLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textPrimary,
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

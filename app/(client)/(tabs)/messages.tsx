import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Image, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/config/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useClientTheme } from '@/contexts/ClientThemeContext';
import type { ClientThemeColors } from '@/contexts/ClientThemeContext';

type Conversation = {
  id: string;
  userName: string;
  lastMessage: string;
  time: string;
  unread: number;
  avatar: string;
  participantId?: string | null;
};

const formatTime = (iso?: string) => {
  if (!iso) return '';
  try {
    const date = new Date(iso);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString(undefined, { weekday: 'short' });
  } catch {
    return '';
  }
};

export default function ClientMessagesScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const currentUserId = (profile as any)?._id || (profile as any)?.id;
  const { colors } = useClientTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const placeholderColor = useMemo(
    () => (colors.accentContrast === '#000000' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)'),
    [colors]
  );

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      const res = await fetch(`${API_URL}/api/messages/conversations`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error('Failed to load conversations');
      const data = await res.json();
      const list: Conversation[] = (data.data || []).map((conversation: any) => {
        const participants = conversation.participants || [];
        const other = participants.find((p: any) => String(p._id || p.id) !== String(currentUserId)) || participants[0] || {};
        const name = other.firstName || other.lastName ? `${other.firstName || ''} ${other.lastName || ''}`.trim() : 'Conversation';
        const initials = name ? name.split(' ').map((part: string) => part[0]).join('').slice(0, 2).toUpperCase() : 'T';
        const avatar = other.profilePhoto || `https://ui-avatars.com/api/?background=007AFF&color=fff&name=${encodeURIComponent(initials || 'T')}`;
        return {
          id: conversation._id || conversation.id,
          userName: name || 'Conversation',
          lastMessage: conversation.lastMessage?.content || 'Aucun message pour le moment',
          time: formatTime(conversation.lastMessage?.createdAt),
          unread: conversation.unreadCount || 0,
          avatar,
          participantId: other._id || other.id,
        };
      });
      setConversations(list);
    } catch (error) {
      console.warn('Failed to load conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((conv) =>
      conv.userName.toLowerCase().includes(q) || conv.lastMessage.toLowerCase().includes(q),
    );
  }, [conversations, searchQuery]);

  const openConversation = (conversation: Conversation) => {
    router.push({
      pathname: '/(client)/chat/[id]',
      params: { id: conversation.id },
    });
  };

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity style={styles.conversationItem} onPress={() => openConversation(item)}>
      <Image source={{ uri: item.avatar }} style={styles.avatar} />
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.userName} numberOfLines={1}>
            {item.userName}
          </Text>
          <Text style={styles.time}>{item.time}</Text>
        </View>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.lastMessage}
        </Text>
      </View>
      {item.unread > 0 ? (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadCount}>{item.unread}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Discussions</Text>
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher"
            placeholderTextColor={placeholderColor}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => item.id}
        renderItem={renderConversation}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadConversations}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Aucune discussion</Text>
              <Text style={styles.emptySubtitle}>Démarrez un échange depuis la fiche d’un mécanicien.</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ClientThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingTop: 28,
      paddingBottom: 12,
      paddingHorizontal: 18,
      backgroundColor: colors.accent,
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.accentContrast,
      marginBottom: 12,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderRadius: 16,
      paddingHorizontal: 12,
      height: 36,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    searchInput: {
      flex: 1,
      color: colors.accentContrast,
      fontSize: 15,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 32,
      gap: 12,
    },
    conversationItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 12,
      backgroundColor: colors.surface,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      marginRight: 14,
      backgroundColor: colors.surfaceAlt,
    },
    conversationContent: {
      flex: 1,
    },
    conversationHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    userName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginRight: 8,
    },
    time: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    lastMessage: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    unreadBadge: {
      minWidth: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 10,
      paddingHorizontal: 6,
    },
    unreadCount: {
      color: colors.accentContrast,
      fontSize: 12,
      fontWeight: '600',
    },
    emptyState: {
      paddingTop: 80,
      alignItems: 'center',
      gap: 8,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: 32,
    },
  });

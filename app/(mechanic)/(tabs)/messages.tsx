import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, TextInput, Image, ListRenderItem } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';

// Types
type Conversation = {
  id: string;
  userName: string;
  lastMessage: string;
  time: string;
  unread: number;
  avatar: string;
};

type ConversationItemProps = {
  item: Conversation;
  onPress: () => void;
};

// Conversations chargées depuis l'API
const formatTime = (iso?: string) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return '';
  }
};

// Composant d'un élément de conversation
const ConversationItem: React.FC<ConversationItemProps> = ({ item, onPress }) => (
  <TouchableOpacity style={styles.conversationItem} onPress={onPress}>
    <Image source={{ uri: item.avatar }} style={styles.avatar} />
    <View style={styles.conversationContent}>
      <View style={styles.conversationHeader}>
        <Text style={styles.userName}>{item.userName}</Text>
        <Text style={styles.time}>{item.time}</Text>
      </View>
      <Text 
        style={[styles.lastMessage, item.unread > 0 && styles.unreadMessage]}
        numberOfLines={1}
      >
        {item.lastMessage}
      </Text>
      {item.unread > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadCount}>{item.unread}</Text>
        </View>
      )}
    </View>
  </TouchableOpacity>
);

export default function MechanicMessagesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { profile } = useAuth();
  const currentUserId = (profile as any)?._id || (profile as any)?.id;

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Implémentez ici la logique de recherche si nécessaire
  };

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) =>
      c.userName.toLowerCase().includes(q) ||
      c.lastMessage.toLowerCase().includes(q)
    );
  }, [searchQuery, conversations]);

  const loadConversations = useCallback(async () => {
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
      const convs: Conversation[] = (data.data || []).map((c: any) => {
        const selfId = String(currentUserId ?? c.currentUserId ?? '');
        const other = (c.participants || []).find((p: any) => String(p._id || p.id) !== selfId) || c.participants?.[0] || {};
        return {
          id: c._id || c.id,
          userName: other.firstName ? `${other.firstName} ${other.lastName || ''}`.trim() : 'Conversation',
          lastMessage: c.lastMessage?.content || '',
          time: formatTime(c.lastMessage?.createdAt),
          unread: c.unreadCount || 0,
          avatar: other.profilePhoto || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(other.firstName || 'U')
        };
      });
      setConversations(convs);
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations])
  );

  const renderConversationItem: ListRenderItem<Conversation> = ({ item }) => (
    <ConversationItem 
      item={item} 
      onPress={() => handleOpenConversation(item)} 
    />
  );

  const handleOpenConversation = (conversation: Conversation) => {
    router.push({ pathname: '/(mechanic)/chat/[id]', params: { id: conversation.id } });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <View style={styles.headerRight}>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher..."
              value={searchQuery}
              onChangeText={handleSearch}
              placeholderTextColor="#999"
            />
            {searchQuery === '' ? (
              <Ionicons name="search" size={18} color="rgba(255, 255, 255, 0.7)" style={styles.searchIcon} />
            ) : (
              <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={18} color="rgba(255, 255, 255, 0.7)" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => item.id}
        renderItem={renderConversationItem}
        style={styles.conversationList}
        refreshing={loading}
        onRefresh={loadConversations}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyWrapper}>
              <Text style={styles.emptyTitle}>Aucune conversation</Text>
              <Text style={styles.emptySubtitle}>
                Les messages envoyés ou reçus apparaîtront ici.
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // En-tête
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#007AFF',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  headerRight: {
    flex: 1,
    marginLeft: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    paddingHorizontal: 10,
    height: 34,
    width: 160,
    alignSelf: 'flex-end',
  },
  searchInput: {
    flex: 1,
    height: 34,
    color: '#FFFFFF',
    paddingVertical: 0,
    paddingHorizontal: 6,
    fontSize: 13,
  },
  searchIcon: {
    marginRight: 4,
  },
  clearButton: {
    padding: 2,
  },
  
  // Liste des conversations
  conversationList: {
    flex: 1,
    marginTop: -10,
    paddingHorizontal: 12,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: '#f0f0f0', // Couleur de fond par défaut
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A1F44',
  },
  time: {
    fontSize: 12,
    color: '#999',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  unreadMessage: {
    color: '#0A1F44',
    fontWeight: '500',
  },
  unreadBadge: {
    position: 'absolute',
    right: 0,
    top: '50%',
    backgroundColor: '#0A1F44',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateY: -10 }],
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // Bouton de retour
  emptyWrapper: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A1F44',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

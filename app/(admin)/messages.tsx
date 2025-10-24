import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, MessageCircle, X } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/lib/supabase';
import { API_URL } from '@/config/api';

interface Conversation {
  id: string;
  userName: string;
  userType: 'client' | 'mechanic';
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  userAvatar?: string;
}

export default function AdminMessagesScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'client' | 'mechanic'>('all');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
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
      const convs: Conversation[] = (data.data || []).map((c: any) => ({
        id: c._id || c.id,
        userName: c.otherParticipant?.firstName ? `${c.otherParticipant.firstName} ${c.otherParticipant.lastName || ''}`.trim() : (c.title || 'Conversation'),
        userType: c.otherParticipant?.role === 'CLIENT' ? 'client' : 'mechanic',
        lastMessage: c.lastMessage?.content || '',
        lastMessageTime: c.lastMessage?.createdAt ? new Date(c.lastMessage.createdAt).toLocaleString() : '',
        unreadCount: c.unreadCount || 0,
        userAvatar: c.otherParticipant?.profilePhoto,
      }));
      setConversations(convs);
    } catch (e) {
      // garder silencieux si pas de conversations
      setConversations([]);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.userName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const searchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.admin.users();
      const users = (res.users || []) as any[];
      const filtered = users.filter((u) => {
        if (filterType !== 'all' && ((filterType === 'client' && u.role !== 'CLIENT') || (filterType === 'mechanic' && u.role !== 'MECANICIEN'))) {
          return false;
        }
        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
        const phone = (u.phoneNumber || '').toLowerCase();
        const q = searchQuery.trim().toLowerCase();
        if (!q) return true;
        return fullName.includes(q) || phone.includes(q);
      });
      setSearchResults(filtered);
    } catch (e) {
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const startConversation = async (participantId: string) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const res = await fetch(`${API_URL}/api/messages/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ participantId }),
      });
      if (!res.ok) throw new Error('Failed to start conversation');
      const data = await res.json();
      const conversationId = data?.data?._id || data?.data?.id;
      if (conversationId) {
        router.push(`/(admin)/chat/${conversationId}` as any);
      } else {
        await loadConversations();
      }
    } catch (e) {
      // noop
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const res = await fetch(`${API_URL}/api/messages/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error('Failed to delete conversation');
      await loadConversations();
    } catch (e) {
      // noop
    }
  };

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => router.push(`/(admin)/chat/${item.id}` as any)}
    >
      <View style={styles.avatarContainer}>
        {item.userAvatar ? (
          <Image source={{ uri: item.userAvatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {item.userName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unreadCount}</Text>
          </View>
        )}
      </View>

      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.userName}>{item.userName}</Text>
          <Text style={styles.messageTime}>{item.lastMessageTime}</Text>
        </View>
        <View style={styles.conversationFooter}>
          <Text
            style={[
              styles.lastMessage,
              item.unreadCount > 0 && styles.unreadMessage,
            ]}
            numberOfLines={1}
          >
            {item.lastMessage}
          </Text>
          <View
            style={[
              styles.userTypeBadge,
              item.userType === 'client'
                ? styles.clientBadge
                : styles.mechanicBadge,
            ]}
          >
            <Text style={styles.userTypeText}>
              {item.userType === 'client' ? 'Client' : 'Mécanicien'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Nom, téléphone..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
          <X size={18} color="#666" />
        </TouchableOpacity>
      </View>
      {/* Type filters */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 }}>
        {(['all','client','mechanic'] as const).map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => setFilterType(t)}
            style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: filterType===t? '#0A1F44':'#EEE' }}
          >
            <Text style={{ color: filterType===t? '#FFF':'#333', fontWeight: '600', fontSize: 12 }}>
              {t==='all'?'Tous': t==='client'?'Clients':'Mécaniciens'}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={searchUsers} style={{ marginLeft: 'auto', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: '#0A1F44' }}>
          <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 12 }}>{loading? '...' : 'Rechercher'}</Text>
        </TouchableOpacity>
      </View>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <View style={{ backgroundColor: '#FFF', marginHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 12 }}>
          {searchResults.map((u, idx) => (
            <View key={u._id || u.id || idx} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: idx===searchResults.length-1? 0: 1, borderBottomColor: '#F0F0F0' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600' }}>{`${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Utilisateur'}</Text>
                <Text style={{ fontSize: 12, color: '#666' }}>{u.phoneNumber || '—'} • {u.role}</Text>
              </View>
              <TouchableOpacity onPress={() => startConversation(u._id || u.id)} style={{ backgroundColor: '#0A1F44', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}>
                <Text style={{ color: '#FFF', fontWeight: '600' }}>Discuter</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Conversations List */}
      {filteredConversations.length > 0 ? (
        <FlatList
          data={filteredConversations}
          renderItem={({ item }) => (
            <View>
              {renderConversation({ item })}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingVertical: 6, backgroundColor: '#FFF' }}>
                <TouchableOpacity onPress={() => deleteConversation(item.id)}>
                  <Text style={{ color: '#FF3B30', fontWeight: '600' }}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <MessageCircle size={64} color="#CCCCCC" />
          <Text style={styles.emptyTitle}>Aucune conversation</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? 'Aucun résultat trouvé'
              : 'Les conversations apparaîtront ici'}
          </Text>
        </View>
      )}
    </View>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  listContent: {
    paddingBottom: 16,
  },
  conversationItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '600',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
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
    color: '#000',
  },
  messageTime: {
    fontSize: 12,
    color: '#999',
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  unreadMessage: {
    fontWeight: '600',
    color: '#000',
  },
  userTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  clientBadge: {
    backgroundColor: '#E3F2FD',
  },
  mechanicBadge: {
    backgroundColor: '#E8F5E9',
  },
  userTypeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});

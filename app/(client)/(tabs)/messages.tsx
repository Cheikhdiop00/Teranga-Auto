import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, MessageCircle, X } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/lib/supabase';
import { API_URL } from '@/config/api';

interface Conversation {
  id: string;
  userName: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export default function ClientMessagesScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);

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
      const convs: Conversation[] = (data.data || []).map((c: any) => {
        const other = (c.participants || []).find((p: any) => (p._id || p.id) !== profile?.id) || {};
        return {
          id: c._id || c.id,
          userName: other.firstName ? `${other.firstName} ${other.lastName || ''}`.trim() : 'Conversation',
          lastMessage: c.lastMessage?.content || '',
          lastMessageTime: c.lastMessage?.createdAt ? new Date(c.lastMessage.createdAt).toLocaleString() : '',
          unreadCount: c.unreadCount || 0,
        };
      });
      setConversations(convs);
    } catch {
      setConversations([]);
    }
  };

  const searchMechanics = async () => {
    try {
      setLoading(true);
      const list = await api.mechanics.list();
      const q = searchQuery.trim().toLowerCase();
      const filtered = (Array.isArray(list) ? list : []).filter((m: any) => {
        const name = `${m.user?.firstName || m.firstName || ''} ${m.user?.lastName || m.lastName || ''}`.toLowerCase();
        const phone = (m.user?.phoneNumber || m.phoneNumber || '').toLowerCase();
        const specialties = (m.specialties || []).join(',').toLowerCase();
        if (!q) return true;
        return name.includes(q) || phone.includes(q) || specialties.includes(q);
      });
      setResults(filtered);
    } catch {
      setResults([]);
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
        router.push(`/(client)/chat/${conversationId}` as any);
      } else {
        await loadConversations();
      }
    } catch {}
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
    } catch {}
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>

      <View style={styles.searchBar}>
        <Search size={20} color="#666" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un mécanicien (nom, téléphone, spécialité)"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity onPress={() => { setSearchQuery(''); setResults([]); }}>
          <X size={18} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.searchButton} onPress={searchMechanics}>
          <Text style={styles.searchButtonText}>{loading ? '...' : 'Rechercher'}</Text>
        </TouchableOpacity>
      </View>

      {results.length > 0 && (
        <View style={styles.resultsCard}>
          {results.map((m: any, idx: number) => (
            <View key={m._id || m.id || idx} style={styles.resultRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.resultName}>{`${m.user?.firstName || m.firstName || ''} ${m.user?.lastName || m.lastName || ''}`.trim() || 'Mécanicien'}</Text>
                <Text style={styles.resultMeta}>{m.user?.phoneNumber || m.phoneNumber || '—'} • {(m.specialties || []).join(', ')}</Text>
              </View>
              <TouchableOpacity style={styles.chatBtn} onPress={() => startConversation(m.user?._id || m.user?.id || m._id || m.id)}>
                <Text style={styles.chatBtnText}>Discuter</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.sectionTitle}>Vos conversations</Text>

      {conversations.length > 0 ? (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.convItem}>
              <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push(`/(client)/chat/${item.id}` as any)}>
                <Text style={styles.convName}>{item.userName}</Text>
                <Text style={styles.convLast}>{item.lastMessage}</Text>
                <Text style={styles.convTime}>{item.lastMessageTime}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteConversation(item.id)}>
                <Text style={styles.deleteText}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 16 }}
        />
      ) : (
        <View style={styles.empty}>
          <MessageCircle size={64} color="#CCC" />
          <Text style={styles.emptyTitle}>Aucune conversation</Text>
          <Text style={styles.emptySub}>Recherchez un mécanicien pour démarrer une discussion</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  title: { fontSize: 22, fontWeight: '700', color: '#000' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 16, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0' },
  searchInput: { flex: 1, fontSize: 16, color: '#000' },
  searchButton: { marginLeft: 8, backgroundColor: '#0A1F44', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  searchButtonText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  resultsCard: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 12 },
  resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  resultName: { fontSize: 14, fontWeight: '600', color: '#000' },
  resultMeta: { fontSize: 12, color: '#666' },
  chatBtn: { backgroundColor: '#0A1F44', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  chatBtnText: { color: '#FFF', fontWeight: '600' },
  sectionTitle: { marginHorizontal: 16, marginTop: 8, marginBottom: 8, fontSize: 16, fontWeight: '600', color: '#000' },
  convItem: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', flexDirection: 'row', alignItems: 'center', gap: 12 },
  convName: { fontSize: 15, fontWeight: '600', color: '#000' },
  convLast: { fontSize: 13, color: '#666', marginTop: 2 },
  convTime: { fontSize: 11, color: '#999', marginTop: 2 },
  deleteText: { color: '#FF3B30', fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#666', marginTop: 12 },
  emptySub: { fontSize: 14, color: '#999', marginTop: 4, textAlign: 'center' },
});

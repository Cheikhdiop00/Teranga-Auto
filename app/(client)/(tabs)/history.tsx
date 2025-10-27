import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';

type HistoryRecord = {
  _id: string;
  mechanicName?: string;
  serviceType?: string;
  description?: string;
  locationAddress?: string;
  requestDate?: string;
  interventionDate?: string;
  closedAt?: string;
  status: string;
  estimatedCost?: number;
  distanceKm?: number;
  durationMinutes?: number;
};

const HistoryCard = ({ item }: { item: HistoryRecord }) => {
  const serviceTitle = item.serviceType || 'Intervention Teranga Auto';
  const description = item.description || 'Aucune description fournie.';
  const closedDate = item.closedAt || item.interventionDate || item.requestDate;
  const formattedDate = closedDate ? new Date(closedDate).toLocaleString() : 'Date inconnue';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatarFallback}>
          <Ionicons name="construct" size={18} color="#fff" />
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardTitle}>{serviceTitle}</Text>
          <Text style={styles.cardSubtitle}>{item.mechanicName || 'Mécanicien Teranga Auto'}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>Terminé</Text>
        </View>
      </View>

      <Text style={styles.cardDescription}>{description}</Text>

      <View style={styles.metaRow}>
        <Ionicons name="calendar" size={16} color="#64748B" />
        <Text style={styles.metaText}>{formattedDate}</Text>
      </View>
      {item.locationAddress ? (
        <View style={styles.metaRow}>
          <Ionicons name="location" size={16} color="#64748B" />
          <Text style={styles.metaText}>{item.locationAddress}</Text>
        </View>
      ) : null}

      <View style={styles.tagsRow}>
        {typeof item.distanceKm === 'number' && (
          <View style={styles.tag}>
            <Ionicons name="navigate" size={14} color="#2563EB" />
            <Text style={styles.tagText}>{item.distanceKm.toFixed(1)} km</Text>
          </View>
        )}
        {typeof item.durationMinutes === 'number' && (
          <View style={styles.tag}>
            <Ionicons name="time" size={14} color="#2563EB" />
            <Text style={styles.tagText}>{item.durationMinutes} min</Text>
          </View>
        )}
        {typeof item.estimatedCost === 'number' && (
          <View style={styles.tag}>
            <Ionicons name="cash" size={14} color="#2563EB" />
            <Text style={styles.tagText}>{item.estimatedCost.toFixed(0)} CFA</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default function ClientHistoryScreen() {
  const { profile } = useAuth();
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientId = useMemo(() => profile?.id || (profile as any)?._id, [profile]);

  const fetchHistory = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!clientId) return;
      if (!opts?.silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const res = await fetch(`${API_URL}/api/histories/byClient/${clientId}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: 'Impossible de charger votre historique.' }));
          throw new Error(err.message || 'Impossible de charger votre historique.');
        }
        const data: HistoryRecord[] = await res.json();
        setHistory(data);
      } catch (err: any) {
        setError(err?.message || 'Erreur inattendue.');
      } finally {
        if (!opts?.silent) {
          setLoading(false);
        }
      }
    },
    [API_URL, clientId]
  );

  useEffect(() => {
    if (clientId) {
      fetchHistory();
    }
  }, [fetchHistory, clientId]);

  const onRefresh = useCallback(async () => {
    if (!clientId) return;
    setRefreshing(true);
    await fetchHistory({ silent: true });
    setRefreshing(false);
  }, [fetchHistory, clientId]);

  if (!clientId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="warning" size={40} color="#999" />
          <Text style={styles.emptyStateText}>Profil client introuvable.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Vos interventions</Text>
        <Text style={styles.subtitle}>Retrouvez l’historique de vos missions effectuées avec Teranga Auto.</Text>
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#0A1F44" />
          <Text style={styles.loadingText}>Chargement de votre historique...</Text>
        </View>
      ) : error ? (
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle" size={48} color="#FF3B30" />
          <Text style={styles.emptyStateText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchHistory()}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <HistoryCard item={item} />}
          contentContainerStyle={history.length === 0 ? styles.emptyList : styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color="#DDD" />
              <Text style={styles.emptyStateText}>Aucune intervention terminée pour le moment.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0A1F44',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  emptyList: {
    flexGrow: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A1F44',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803D',
  },
  cardDescription: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  metaText: {
    fontSize: 13,
    color: '#475569',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  tagText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#475569',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: {
    color: '#FFF',
    fontWeight: '600',
  },
});

import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { API_URL } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';

type HistoryRecord = {
  _id: string;
  clientName?: string;
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

const MissionCard = ({ mission }: { mission: HistoryRecord }) => {
  const serviceTitle = mission.serviceType || 'Mission client';
  const description = mission.description || 'Aucune description disponible.';
  const closedDate = mission.closedAt || mission.interventionDate || mission.requestDate;
  const formattedDate = closedDate ? new Date(closedDate).toLocaleDateString() : 'Date inconnue';
  return (
    <View style={styles.missionCard}>
      <View style={styles.missionHeader}>
        <View style={styles.avatarFallback}>
          <Ionicons name="person" size={20} color="#FFFFFF" />
        </View>
        <View style={styles.missionInfo}>
          <Text style={styles.clientName}>{mission.clientName || 'Client Teranga Auto'}</Text>
          <Text style={styles.missionMeta}>{mission.locationAddress || 'Adresse non renseignée'}</Text>
        </View>
        <Text style={[styles.status, styles.statusCompleted]}>Terminé</Text>
      </View>

      <View style={styles.serviceInfo}>
        <Text style={styles.serviceTitle}>{serviceTitle}</Text>
        <Text style={styles.serviceName}>{description}</Text>
        <View style={styles.tagsRow}>
          {typeof mission.distanceKm === 'number' && (
            <View style={styles.tag}>
              <Ionicons name="navigate" size={14} color="#2563EB" />
              <Text style={styles.tagText}>{mission.distanceKm.toFixed(1)} km</Text>
            </View>
          )}
          {typeof mission.durationMinutes === 'number' && (
            <View style={styles.tag}>
              <Ionicons name="time" size={14} color="#2563EB" />
              <Text style={styles.tagText}>{mission.durationMinutes} min</Text>
            </View>
          )}
          {typeof mission.estimatedCost === 'number' && (
            <View style={styles.tag}>
              <Ionicons name="cash" size={14} color="#2563EB" />
              <Text style={styles.tagText}>{mission.estimatedCost.toFixed(0)} CFA</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.missionFooter}>
        <Text style={styles.date}>{formattedDate}</Text>
        <Text style={styles.amount}>{mission.mechanicName || ''}</Text>
      </View>
    </View>
  );
};

export default function MechanicHistoryScreen() {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [missions, setMissions] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mechanicId = useMemo(() => profile?.id || (profile as any)?._id, [profile]);

  const fetchHistory = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!mechanicId) return;
      if (!opts?.silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const res = await fetch(`${API_URL}/api/histories/byMechanic/${mechanicId}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: "Impossible de charger l'historique." }));
          throw new Error(err.message || "Impossible de charger l'historique.");
        }
        const data: HistoryRecord[] = await res.json();
        setMissions(data);
      } catch (err: any) {
        setError(err?.message || 'Erreur inattendue.');
      } finally {
        if (!opts?.silent) {
          setLoading(false);
        }
      }
    },
    [API_URL, mechanicId]
  );

  useEffect(() => {
    if (mechanicId) {
      fetchHistory();
    }
  }, [fetchHistory, mechanicId]);

  const onRefresh = useCallback(async () => {
    if (!mechanicId) return;
    setRefreshing(true);
    await fetchHistory({ silent: true });
    setRefreshing(false);
  }, [fetchHistory, mechanicId]);

  const filteredMissions = useMemo(() => {
    if (!searchQuery.trim()) return missions;
    const query = searchQuery.toLowerCase();
    return missions.filter((mission) =>
      (mission.clientName && mission.clientName.toLowerCase().includes(query)) ||
      (mission.serviceType && mission.serviceType.toLowerCase().includes(query)) ||
      (mission.description && mission.description.toLowerCase().includes(query))
    );
  }, [missions, searchQuery]);

  if (!mechanicId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="warning" size={40} color="#999" />
          <Text style={styles.emptyStateText}>Profil mécanicien introuvable.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Historique</Text>
        <View style={styles.headerRight}>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
            {searchQuery === '' ? (
              <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
            ) : (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        </View>
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
          data={filteredMissions}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <View style={styles.missionCardContainer}>
              <MissionCard mission={item} />
            </View>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color="#DDD" />
              <Text style={styles.emptyStateText}>Aucune mission terminée pour le moment.</Text>
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
  headerContent: {
    width: '100%',
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
  searchIcon: {
    marginRight: 4,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  searchInput: {
    flex: 1,
    height: 34,
    color: '#FFFFFF',
    paddingVertical: 0,
    paddingHorizontal: 6,
    fontSize: 13,
  },
  clearButton: {
    padding: 2,
  },
  missionCardContainer: {
    position: 'relative',
  },
  deleteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#0A1F44',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 10,
  },
  headerRight: {
    flex: 1,
    marginLeft: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  listContent: {
    padding: 12,
    paddingBottom: 24,
    marginTop: -10,
  },
  missionCard: {
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
  missionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  missionInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A1F44',
    marginBottom: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  status: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  statusCompleted: {
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
  },
  serviceInfo: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  serviceTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A1F44',
    marginBottom: 4,
  },
  carModel: {
    fontSize: 14,
    color: '#666',
  },
  missionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: 14,
    color: '#999',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0A1F44',
  },
});

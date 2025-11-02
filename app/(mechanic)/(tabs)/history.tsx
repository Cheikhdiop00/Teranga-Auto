import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { API_URL } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { Swipeable } from 'react-native-gesture-handler';

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

const getStatusConfig = (status: string) => {
  const statusMap: Record<string, { label: string; bg: string; color: string }> = {
    pending: { label: 'En attente', bg: '#FEF3C7', color: '#92400E' },
    accepted: { label: 'Accepté', bg: '#DBEAFE', color: '#1E40AF' },
    in_progress: { label: 'En cours', bg: '#E0E7FF', color: '#3730A3' },
    completed: { label: 'Terminé', bg: '#DCFCE7', color: '#15803D' },
    cancelled: { label: 'Annulé', bg: '#FEE2E2', color: '#991B1B' },
  };
  return statusMap[status] || { label: status, bg: '#F3F4F6', color: '#6B7280' };
};

const MissionCard = ({ mission }: { mission: HistoryRecord }) => {
  const serviceTitle = mission.serviceType || 'Mission client';
  const description = mission.description || 'Aucune description disponible.';
  const closedDate = mission.closedAt || mission.interventionDate || mission.requestDate;
  const formattedDate = closedDate ? new Date(closedDate).toLocaleDateString() : 'Date inconnue';
  const statusConfig = getStatusConfig(mission.status);
  
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
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
          <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
        </View>
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
  const [missions, setMissions] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mechanicDocId, setMechanicDocId] = useState<string | null>(null);
  const [archivedMissions, setArchivedMissions] = useState<HistoryRecord[]>([]);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [archiveModalVisible, setArchiveModalVisible] = useState(false);

  const profileMechanicRecordId = useMemo(
    () => (profile as any)?.mechanic_record_id || null,
    [profile],
  );

  const userId = useMemo(() => profile?.id || (profile as any)?._id, [profile]);

  const ensureMechanicDocId = useCallback(async () => {
    if (mechanicDocId) return mechanicDocId;
    if (profileMechanicRecordId) {
      setMechanicDocId(profileMechanicRecordId);
      return profileMechanicRecordId;
    }
    if (!userId) return null;
    try {
      const res = await fetch(`${API_URL}/api/mechanics`);
      if (!res.ok) return null;
      const data = await res.json();
      const mechanicsArray = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : [];
      const record = mechanicsArray.find((item: any) => {
        const mechanicUserId = item?.user?._id || item?.user?.id || item?.user;
        return mechanicUserId && String(mechanicUserId) === String(userId);
      });
      if (record?._id) {
        const id = String(record._id);
        setMechanicDocId(id);
        return id;
      }
    } catch {
      // silencieux
    }
    return null;
  }, [API_URL, mechanicDocId, profileMechanicRecordId, userId]);

  useEffect(() => {
    if (profileMechanicRecordId) {
      setMechanicDocId(profileMechanicRecordId);
    }
  }, [profileMechanicRecordId]);

  const sortMissions = useCallback((items: HistoryRecord[]) => {
    return items.slice().sort((a, b) => {
      const dateA = new Date(a.closedAt || a.interventionDate || a.requestDate || 0).getTime();
      const dateB = new Date(b.closedAt || b.interventionDate || b.requestDate || 0).getTime();
      return dateB - dateA;
    });
  }, []);

  const fetchHistory = useCallback(
    async (opts?: { silent?: boolean }) => {
      const docId = await ensureMechanicDocId();
      if (!docId) return;
      if (!opts?.silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const res = await fetch(`${API_URL}/api/histories/byMechanic/${docId}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: 'Impossible de charger vos services.' }));
          throw new Error(err.message || 'Impossible de charger vos services.');
        }
        const raw = await res.json();
        const data: HistoryRecord[] = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.data)
            ? raw.data
            : [];
        setMissions(sortMissions(data));
      } catch (err: any) {
        setError(err?.message || 'Erreur inattendue.');
      } finally {
        if (!opts?.silent) {
          setLoading(false);
        }
      }
    },
    [API_URL, ensureMechanicDocId, sortMissions]
  );

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHistory({ silent: true });
    setRefreshing(false);
  }, [fetchHistory]);

  const filteredMissions = missions;

  const handleDeleteMission = useCallback((mission: HistoryRecord) => {
    setPendingDeleteId(mission._id);
    setMissions((prev) => prev.filter((item) => item._id !== mission._id));
    setArchivedMissions((prev) =>
      prev.some((item) => item._id === mission._id) ? prev : [...prev, mission],
    );
    setPendingDeleteId(null);
  }, []);

  const handleArchiveIconPress = useCallback(() => {
    if (!archivedMissions.length) {
      Alert.alert('Archive vide', 'Aucun service supprimé à archiver pour le moment.');
      return;
    }
    setArchiveModalVisible(true);
  }, [archivedMissions]);

  const handleRestoreMission = useCallback((mission: HistoryRecord) => {
    setArchivedMissions((prev) => prev.filter((item) => item._id !== mission._id));
    setMissions((prev) => sortMissions([...prev, mission]));
    if (archivedMissions.length <= 1) {
      setArchiveModalVisible(false);
    }
  }, [archivedMissions.length, sortMissions]);

  if (!mechanicDocId && !profileMechanicRecordId) {
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
        <View style={styles.headerLeft}>
          <Ionicons name="construct" size={20} color="#E0F2FE" />
          <View>
            <Text style={styles.title}>Mes services</Text>
            <Text style={styles.subtitle}>Historique des missions réalisées</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.archiveButton} onPress={handleArchiveIconPress}>
          <Ionicons name="archive-outline" size={18} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#0A1F44" />
          <Text style={styles.loadingText}>Chargement de vos services...</Text>
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
              <Swipeable
                renderRightActions={() => (
                  <TouchableOpacity
                    style={styles.deleteAction}
                    onPress={() => handleDeleteMission(item)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.deleteActionText}>Supprimer</Text>
                  </TouchableOpacity>
                )}
                onSwipeableOpen={(direction) => {
                  if (direction === 'right') {
                    handleDeleteMission(item);
                  }
                }}
                overshootRight={false}
              >
                <View
                  style={[
                    styles.missionCard,
                    pendingDeleteId === item._id && styles.missionCardDeleting,
                  ]}
                >
                  <MissionCard mission={item} />
                </View>
              </Swipeable>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color="#DDD" />
              <Text style={styles.emptyStateText}>Aucun service pour le moment.</Text>
            </View>
          }
        />
      )}
      <Modal
        visible={archiveModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setArchiveModalVisible(false)}
      >
        <View style={styles.archiveModalOverlay}>
          <View style={styles.archiveModalCard}>
            <View style={styles.archiveModalHeader}>
              <Text style={styles.archiveModalTitle}>Services archivés</Text>
              <TouchableOpacity onPress={() => setArchiveModalVisible(false)}>
                <Ionicons name="close" size={20} color="#1F2937" />
              </TouchableOpacity>
            </View>
            {archivedMissions.length === 0 ? (
              <View style={styles.archiveEmpty}>
                <Ionicons name="file-tray-outline" size={36} color="#CBD5F5" />
                <Text style={styles.archiveEmptyText}>Aucun service archivé.</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ gap: 12 }}>
                {archivedMissions.map((mission) => (
                  <View key={mission._id} style={styles.archiveItem}>
                    <View style={styles.archiveItemContent}>
                      <Text style={styles.archiveItemTitle}>{mission.clientName || 'Client Teranga Auto'}</Text>
                      <Text style={styles.archiveItemSubtitle}>{mission.serviceType || 'Mission client'}</Text>
                      <Text style={styles.archiveItemDate}>
                        {new Date(mission.closedAt || mission.interventionDate || mission.requestDate || 0).toLocaleDateString()}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.restoreButton}
                      onPress={() => handleRestoreMission(mission)}
                    >
                      <Ionicons name="refresh" size={16} color="#2563EB" />
                      <Text style={styles.restoreButtonText}>Restaurer</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
  missionCardContainer: {
    position: 'relative',
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
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 18,
    backgroundColor: '#0A84FF',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#0A1F44',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(226, 232, 240, 0.85)',
    marginTop: 2,
  },
  archiveButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 10,
  },
  missionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  missionCardDeleting: {
    opacity: 0.55,
  },
  missionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  missionInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0A1F44',
    marginBottom: 2,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
  },
  missionMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  serviceInfo: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  serviceTitle: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0A1F44',
    marginBottom: 2,
  },
  carModel: {
    fontSize: 14,
    color: '#666',
  },
  missionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0A1F44',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  tagText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '600',
  },
  deleteAction: {
    width: 94,
    marginVertical: 8,
    marginLeft: 8,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  deleteActionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  archiveModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.35)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  archiveModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    gap: 12,
  },
  archiveModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  archiveModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  archiveEmpty: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 32,
  },
  archiveEmptyText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  archiveItem: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  archiveItemContent: {
    flex: 1,
    gap: 4,
  },
  archiveItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  archiveItemSubtitle: {
    fontSize: 12,
    color: '#475569',
  },
  archiveItemDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2563EB',
    backgroundColor: '#DFE9FF',
  },
  restoreButtonText: {
    color: '#2563EB',
    fontSize: 12,
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

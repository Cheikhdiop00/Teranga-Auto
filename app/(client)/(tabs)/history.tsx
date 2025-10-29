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
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { API_URL } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { useClientTheme } from '@/contexts/ClientThemeContext';
import type { ClientThemeColors } from '@/contexts/ClientThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  deletedAt?: string;
};

const getStatusConfig = (status: string, isDark: boolean) => {
  const statusMap: Record<string, { label: string; bg: string; color: string }> = {
    pending: {
      label: 'En attente',
      bg: isDark ? 'rgba(250, 204, 21, 0.16)' : '#FEF3C7',
      color: '#D97706',
    },
    accepted: {
      label: 'Accepté',
      bg: isDark ? 'rgba(59, 130, 246, 0.18)' : '#DBEAFE',
      color: '#2563EB',
    },
    in_progress: {
      label: 'En cours',
      bg: isDark ? 'rgba(129, 140, 248, 0.18)' : '#E0E7FF',
      color: '#4338CA',
    },
    completed: {
      label: 'Terminé',
      bg: isDark ? 'rgba(34, 197, 94, 0.18)' : '#DCFCE7',
      color: '#15803D',
    },
    cancelled: {
      label: 'Annulé',
      bg: isDark ? 'rgba(248, 113, 113, 0.18)' : '#FEE2E2',
      color: '#DC2626',
    },
  };
  const fallback = {
    label: status,
    bg: isDark ? 'rgba(148, 163, 184, 0.2)' : '#F3F4F6',
    color: '#64748B',
  };
  return statusMap[status] || fallback;
};

const HistoryCard = ({
  item,
  styles,
  isDark,
  onDelete,
  isDeleting = false,
}: {
  item: HistoryRecord;
  styles: ReturnType<typeof createStyles>;
  isDark: boolean;
  onDelete?: () => void;
  isDeleting?: boolean;
}) => {
  const serviceTitle = item.serviceType || 'Intervention Teranga Auto';
  const description = item.description || 'Aucune description fournie.';
  const closedDate = item.closedAt || item.interventionDate || item.requestDate;
  const formattedDate = closedDate ? new Date(closedDate).toLocaleString() : 'Date inconnue';
  const statusConfig = getStatusConfig(item.status, isDark);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.avatarFallback}>
            <Ionicons name="construct" size={16} color="#fff" />
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle} numberOfLines={1}>{serviceTitle}</Text>
            <Text style={styles.cardSubtitle} numberOfLines={1}>{item.mechanicName || 'Mécanicien Teranga Auto'}</Text>
          </View>
        </View>
        <View style={styles.cardHeaderActions}>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
          {onDelete ? (
            <TouchableOpacity
              style={[styles.deleteButton, isDeleting && styles.deleteButtonDisabled]}
              onPress={onDelete}
              disabled={isDeleting}
              accessibilityLabel="Supprimer ce service"
              accessibilityRole="button"
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <Ionicons name="trash-outline" size={16} color="#DC2626" />
              )}
            </TouchableOpacity>
          ) : null}
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

const ARCHIVE_STORAGE_KEY = 'archived_history_records';

export default function ClientHistoryScreen() {
  const { profile } = useAuth();
  const { colors } = useClientTheme();
  const router = useRouter();
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientDocId, setClientDocId] = useState<string | null>(null);
  const [archivedPending, setArchivedPending] = useState<HistoryRecord[]>([]);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [archivedRecords, setArchivedRecords] = useState<HistoryRecord[]>([]);
  const [archiveModalVisible, setArchiveModalVisible] = useState(false);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const profileUserId = useMemo(
    () => profile?.id || (profile as any)?._id || (profile as any)?.userId || null,
    [profile]
  );

  const getAuthHeaders = useCallback(async () => {
    const token = await AsyncStorage.getItem('authToken');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }, []);

  const resolveClientDocId = useCallback(async () => {
    if (clientDocId) {
      return clientDocId;
    }
    if (!profileUserId) {
      return null;
    }
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/clients`, { headers });
      if (!res.ok) {
        console.warn('Impossible de récupérer la liste des clients');
        return null;
      }
      const clients = await res.json();
      const me = Array.isArray(clients)
        ? clients.find(
            (c: any) =>
              String(c.user) === String(profileUserId) ||
              String(c.user?._id) === String(profileUserId)
          )
        : null;
      if (me?._id) {
        setClientDocId(me._id as string);
        return me._id as string;
      }
    } catch (err) {
      console.warn('resolveClientDocId failed', err);
    }
    return null;
  }, [API_URL, clientDocId, getAuthHeaders, profileUserId]);

  const loadArchivedRecords = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(ARCHIVE_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        const sorted = [...parsed].sort((a, b) => {
          const dateA = new Date(a.deletedAt || a.closedAt || a.requestDate || 0).getTime();
          const dateB = new Date(b.deletedAt || b.closedAt || b.requestDate || 0).getTime();
          return dateB - dateA;
        });
        setArchivedRecords(sorted);
      } else {
        setArchivedRecords([]);
      }
    } catch (err) {
      console.warn('loadArchivedRecords failed', err);
      setArchivedRecords([]);
    }
  }, []);

  const fetchHistory = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const docId = await resolveClientDocId();
        if (!docId) {
          setError("Impossible de retrouver votre fiche client.");
          setHistory([]);
          return;
        }

        const headers = await getAuthHeaders();
        const res = await fetch(`${API_URL}/api/histories/byClient/${docId}`, { headers });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: 'Impossible de charger vos services.' }));
          throw new Error(err.message || 'Impossible de charger vos services.');
        }
        const payload = await res.json();
        const records: HistoryRecord[] = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : [];

        const sorted = records.sort((a, b) => {
          const dateA = new Date(a.closedAt || a.interventionDate || a.requestDate || 0).getTime();
          const dateB = new Date(b.closedAt || b.interventionDate || b.requestDate || 0).getTime();
          return dateB - dateA;
        });
        setHistory(sorted);
      } catch (err: any) {
        setHistory([]);
        setError(err?.message || 'Erreur inattendue.');
      } finally {
        if (!opts?.silent) {
          setLoading(false);
        }
      }
    },
    [API_URL, getAuthHeaders, resolveClientDocId]
  );

  useEffect(() => {
    if (profileUserId) {
      fetchHistory();
    }
  }, [fetchHistory, profileUserId]);

  useEffect(() => {
    loadArchivedRecords();
  }, [loadArchivedRecords]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHistory({ silent: true });
    setRefreshing(false);
  }, [fetchHistory]);

  const deletingSet = useMemo(() => new Set(deletingIds), [deletingIds]);

  const handleDeleteRecord = useCallback(
    (record: HistoryRecord) => {
      Alert.alert(
        'Supprimer ce service ?',
        'Cette action retirera le service de votre historique. Voulez-vous continuer ?',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: async () => {
              setDeletingIds((prev) => [...prev, record._id]);
              try {
                const headers = await getAuthHeaders();
                const res = await fetch(`${API_URL}/api/histories/${record._id}`, {
                  method: 'DELETE',
                  headers,
                });
                if (!res.ok && res.status !== 404) {
                  const err = await res.json().catch(() => ({ message: 'Impossible de supprimer ce service.' }));
                  throw new Error(err.message || 'Impossible de supprimer ce service.');
                }
                setHistory((prev) => prev.filter((item) => item._id !== record._id));
                const archivedRecord: HistoryRecord = {
                  ...record,
                  deletedAt: new Date().toISOString(),
                };
                setArchivedPending((prev) => [...prev, archivedRecord]);
              } catch (err: any) {
                Alert.alert('Erreur', err?.message || 'Suppression impossible.');
              } finally {
                setDeletingIds((prev) => prev.filter((id) => id !== record._id));
              }
            },
          },
        ]
      );
    },
    [API_URL, getAuthHeaders]
  );

  const archiveDeletedServices = useCallback(async () => {
    if (archivedPending.length === 0) {
      Alert.alert('Archivage', 'Aucun service supprimé à archiver.');
      return;
    }
    try {
      const existingRaw = await AsyncStorage.getItem(ARCHIVE_STORAGE_KEY);
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      const merged = [...archivedPending, ...(Array.isArray(existing) ? existing : [])];
      await AsyncStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(merged));
      setArchivedPending([]);
      await loadArchivedRecords();
      Alert.alert('Archivage', 'Les services supprimés ont été sauvegardés.');
    } catch (err) {
      Alert.alert('Archivage', 'Impossible de sauvegarder les services supprimés.');
    }
  }, [archivedPending, loadArchivedRecords]);

  const handleOpenArchive = useCallback(async () => {
    await loadArchivedRecords();
    setArchiveModalVisible(true);
  }, [loadArchivedRecords]);

  if (!profileUserId) {
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
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Retour"
          style={styles.backButton}
        >
          <ArrowLeft color="#fff" size={20} />
        </TouchableOpacity>
        <Text style={styles.title}>Vos services</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.archiveButton, archivedPending.length === 0 && styles.archiveButtonDisabled]}
            onPress={archiveDeletedServices}
            disabled={archivedPending.length === 0}
            accessibilityRole="button"
            accessibilityLabel="Archiver les services supprimés"
          >
            <Text
              style={[
                styles.archiveButtonText,
                archivedPending.length === 0 && styles.archiveButtonTextDisabled,
              ]}
            >
              {archivedPending.length > 0 ? `Archiver (${archivedPending.length})` : 'Archiver'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.archiveViewButton}
            onPress={handleOpenArchive}
            accessibilityRole="button"
            accessibilityLabel="Consulter les services archivés"
          >
            <Ionicons name="folder-open-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.subHeader}>
        <Text style={styles.subtitle}>Retrouvez tous vos services et interventions avec Teranga Auto.</Text>
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.accent} />
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
          data={history}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <HistoryCard
              item={item}
              styles={styles}
              isDark={isDark(colors)}
              onDelete={() => handleDeleteRecord(item)}
              isDeleting={deletingSet.has(item._id)}
            />
          )}
          contentContainerStyle={history.length === 0 ? styles.emptyList : styles.listContent}
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
        <View style={styles.modalOverlay}>
          <View style={styles.archiveModal}>
            <View style={styles.archiveModalHeader}>
              <Text style={styles.modalTitle}>Services archivés</Text>
              <TouchableOpacity
                onPress={() => setArchiveModalVisible(false)}
                style={styles.archiveCloseButton}
                accessibilityLabel="Fermer les archives"
              >
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            {archivedRecords.length === 0 ? (
              <View style={styles.archiveEmpty}>
                <Ionicons name="folder-open" size={36} color={colors.textSecondary} />
                <Text style={styles.archiveEmptyText}>Aucun service archivé pour le moment.</Text>
              </View>
            ) : (
              <FlatList
                data={archivedRecords}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <HistoryCard item={item} styles={styles} isDark={isDark(colors)} />
                )}
                contentContainerStyle={styles.archiveList}
              />
            )}
          </View>
        </View>
      </Modal>
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
      paddingTop: 48,
      paddingHorizontal: 16,
      paddingBottom: 14,
      backgroundColor: '#0A84FF',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    subHeader: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: '#fff',
      textAlign: 'left',
      flex: 1,
      marginLeft: 12,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.4)',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.12)',
    },
    archiveButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
    },
    archiveButtonDisabled: {
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderColor: 'rgba(255,255,255,0.15)',
    },
    archiveButtonText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    archiveButtonTextDisabled: {
      color: 'rgba(255,255,255,0.6)',
    },
    archiveViewButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
      backgroundColor: 'rgba(255,255,255,0.18)',
    },
    loadingState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
    },
    loadingText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    listContent: {
      paddingHorizontal: 12,
      paddingVertical: 16,
      gap: 10,
    },
    emptyList: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
      gap: 12,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      gap: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 2,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
      minWidth: 0,
    },
    avatarFallback: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cardHeaderText: {
      flex: 1,
      gap: 2,
      minWidth: 0,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    cardSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    cardHeaderActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '600',
    },
    deleteButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(220,38,38,0.12)',
    },
    deleteButtonDisabled: {
      opacity: 0.5,
    },
    cardDescription: {
      fontSize: 13,
      color: colors.textPrimary,
      lineHeight: 20,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    metaText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    tag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 4,
      backgroundColor: isDark(colors)
        ? 'rgba(77, 163, 255, 0.16)'
        : '#EEF2FF',
    },
    tagText: {
      fontSize: 11,
      color: colors.accent,
      fontWeight: '600',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    archiveModal: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      maxHeight: '80%',
      gap: 12,
    },
    archiveModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    archiveCloseButton: {
      padding: 6,
      borderRadius: 16,
      backgroundColor: colors.surfaceAlt,
    },
    archiveEmpty: {
      alignItems: 'center',
      gap: 8,
      paddingVertical: 24,
    },
    archiveEmptyText: {
      color: colors.textSecondary,
      fontSize: 14,
      textAlign: 'center',
    },
    archiveList: {
      gap: 10,
    },
    emptyState: {
      alignItems: 'center',
      gap: 12,
      padding: 24,
    },
    emptyStateText: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
    },
    retryButton: {
      backgroundColor: colors.accent,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 999,
    },
    retryText: {
      color: colors.accentContrast,
      fontWeight: '600',
    },
    commentInput: {
      minHeight: 100,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      marginTop: 12,
      color: colors.textPrimary,
      backgroundColor: colors.surface,
      textAlignVertical: 'top',
    },
  });

const isDark = (colors: ClientThemeColors) => colors.background === '#07070B';

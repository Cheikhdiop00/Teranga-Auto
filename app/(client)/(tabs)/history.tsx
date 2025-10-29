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
import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { API_URL } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { useClientTheme } from '@/contexts/ClientThemeContext';
import type { ClientThemeColors } from '@/contexts/ClientThemeContext';

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

const HistoryCard = ({ item, styles, isDark }: { item: HistoryRecord; styles: ReturnType<typeof createStyles>; isDark: boolean }) => {
  const serviceTitle = item.serviceType || 'Intervention Teranga Auto';
  const description = item.description || 'Aucune description fournie.';
  const closedDate = item.closedAt || item.interventionDate || item.requestDate;
  const formattedDate = closedDate ? new Date(closedDate).toLocaleString() : 'Date inconnue';
  const statusConfig = getStatusConfig(item.status, isDark);

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
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
          <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
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
  const { colors } = useClientTheme();
  const router = useRouter();
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const clientId = useMemo(() => profile?.id || (profile as any)?._id, [profile]);

  const fetchHistory = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!clientId) return;
      if (!opts?.silent) {
        setLoading(true);
        setError(null);
      }
      try {
        // Charger tous les services du client (pas seulement l'historique)
        const res = await fetch(`${API_URL}/api/services/client/${clientId}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: 'Impossible de charger vos services.' }));
          throw new Error(err.message || 'Impossible de charger vos services.');
        }
        const data: HistoryRecord[] = await res.json();
        // Trier par date (plus récent en premier)
        const sorted = data.sort((a, b) => {
          const dateA = new Date(a.closedAt || a.interventionDate || a.requestDate || 0).getTime();
          const dateB = new Date(b.closedAt || b.interventionDate || b.requestDate || 0).getTime();
          return dateB - dateA;
        });
        setHistory(sorted);
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
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Retour"
          style={styles.backButton}
        >
          <ArrowLeft color="#fff" size={20} />
        </TouchableOpacity>
        <Text style={styles.title}>Vos services</Text>
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
          renderItem={({ item }) => <HistoryCard item={item} styles={styles} isDark={isDark(colors)} />}
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
      paddingHorizontal: 20,
      paddingBottom: 18,
      backgroundColor: '#0A84FF',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: 12,
    },
    subHeader: {
      paddingHorizontal: 20,
      paddingVertical: 14,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: '#fff',
      flex: 1,
      textAlign: 'center',
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
      paddingHorizontal: 16,
      paddingVertical: 24,
      gap: 12,
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
      borderRadius: 16,
      padding: 20,
      gap: 16,
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
      gap: 12,
    },
    avatarFallback: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cardHeaderText: {
      flex: 1,
      gap: 4,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    cardSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
    },
    cardDescription: {
      fontSize: 14,
      color: colors.textPrimary,
      lineHeight: 20,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    metaText: {
      fontSize: 13,
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
      paddingVertical: 6,
      backgroundColor: isDark(colors)
        ? 'rgba(77, 163, 255, 0.16)'
        : '#EEF2FF',
    },
    tagText: {
      fontSize: 12,
      color: colors.accent,
      fontWeight: '600',
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

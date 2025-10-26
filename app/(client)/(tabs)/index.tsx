import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Animated,
  Easing,
  FlatList,
  Linking,
  Modal,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as Location from 'expo-location';
import {
  Menu,
  Bell,
  MessageCircle,
  Wrench,
  Zap,
  Car,
  Battery,
  Wind,
  CircuitBoard,
  Disc,
  Shield,
  ChevronRight,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { api } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/config/api';
import { Profile } from '@/types/database';
import { io, Socket } from 'socket.io-client';

type MissionPayload = {
  breakdown: any;
  mechanic: any;
  distanceKm?: number | null;
  etaMinutes?: number | null;
};

const DEFAULT_CANCEL_REASONS = [
  "Le mécanicien n'est jamais arrivé",
  'Délai trop long / retard important',
  'Problème résolu par moi-même',
  'Devis jugé trop coûteux',
  'Problème avec le mécanicien',
];

const MECHANIC_TYPES = [
  { icon: Wrench, label: 'Générale', color: '#007AFF' },
  { icon: Zap, label: 'Électricité', color: '#FF9500' },
  { icon: Car, label: 'Pneu', color: '#34C759' },
  { icon: Shield, label: 'Carrosserie', color: '#FF3B30' },
  { icon: Wind, label: 'Clim', color: '#5AC8FA' },
  { icon: CircuitBoard, label: 'Diagnos', color: '#AF52DE' },
  { icon: Disc, label: 'Freinage', color: '#FF2D55' },
  { icon: Battery, label: 'Vitrage', color: '#FFCC00' },
];

const normalizeSpecialty = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const mapToKnownSpecialtyLabel = (value: string) => {
  const normalized = normalizeSpecialty(value);
  const match = MECHANIC_TYPES.find(
    (type) => normalizeSpecialty(type.label) === normalized,
  );
  return match ? match.label : value;
};

const normalizeMechanicSpecialties = (mechanic: any): string[] => {
  const rawSpecialties: string[] = Array.isArray(mechanic.specialties)
    ? mechanic.specialties.filter((spec: unknown): spec is string => typeof spec === 'string')
    : typeof mechanic.specialty === 'string'
      ? [mechanic.specialty]
      : [];

  const normalized = rawSpecialties
    .map((spec) => spec.trim())
    .filter((spec) => spec.length > 0);

  const unique = Array.from(new Set(normalized));

  return unique.map((spec) => mapToKnownSpecialtyLabel(spec));
};

export default function ClientHomeScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [mechanics, setMechanics] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const servicesAnimation = useRef(new Animated.Value(0)).current;
  const [locationText, setLocationText] = useState<string>('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [clientDocId, setClientDocId] = useState<string | null>(null);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [selectedMechanic, setSelectedMechanic] = useState<Profile | null>(null);
  const [requestDescription, setRequestDescription] = useState('');
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const [activeMission, setActiveMission] = useState<MissionPayload | null>(null);
  const [missionModalVisible, setMissionModalVisible] = useState(false);
  const [ratingValue, setRatingValue] = useState<number>(5);
  const [ratingComment, setRatingComment] = useState('');
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReasons, setReportReasons] = useState<string[]>([]);
  const [otherReason, setOtherReason] = useState('');
  const [submittingMissionAction, setSubmittingMissionAction] = useState(false);
  const [ratingPromptVisible, setRatingPromptVisible] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);

  useEffect(() => {
    loadMechanics();
  }, [selectedType]);

  useEffect(() => {
    Animated.timing(servicesAnimation, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [servicesAnimation]);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationText('Localisation désactivée');
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        const places = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        if (places && places.length > 0) {
          const p = places[0];
          const city = p.city || p.subregion || p.region || '';
          const country = p.country || '';
          const label = [city, country].filter(Boolean).join(', ');
          setLocationText(label || `${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}`);
          await saveLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            address: label,
          });
        } else {
          setLocationText(`${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}`);
          await saveLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            address: undefined,
          });
        }
      } catch {
        setLocationText('Localisation indisponible');
      }
    })();
  }, []);

  const getAuthHeaders = useCallback(async () => {
    const token = await AsyncStorage.getItem('authToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }, []);

  const fetchClientDocId = useCallback(async () => {
    if (clientDocId) {
      return clientDocId;
    }
    try {
      const headers = await getAuthHeaders();
      const listRes = await fetch(`${API_URL}/api/clients`, { headers });
      if (!listRes.ok) return null;
      const clients = await listRes.json();
      const currentUserId = (profile as any)?.id || (profile as any)?._id;
      const me = Array.isArray(clients)
        ? clients.find((c: any) => String(c.user) === String(currentUserId))
        : null;
      if (me && me._id) {
        setClientDocId(me._id);
        return me._id as string;
      }
    } catch {
      return null;
    }
    return null;
  }, [clientDocId, getAuthHeaders, profile]);

  useEffect(() => {
    fetchClientDocId();
  }, [fetchClientDocId]);

  const openMap = async () => {
    try {
      if (coords) {
        const url = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
        await Linking.openURL(url);
        return;
      }
      // Si pas de coords en mémoire, tenter de récupérer vite
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const url = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert('Localisation', "Impossible d'ouvrir la carte. Activez la localisation.");
    }
  };

  // Enregistrer la position de l'utilisateur CLIENT dans la base (collection Clients)
  const saveLocation = async ({ latitude, longitude, address }: { latitude: number; longitude: number; address?: string }) => {
    try {
      const headers = await getAuthHeaders();
      const docId = await fetchClientDocId();
      if (!docId) return;

      await fetch(`${API_URL}/api/clients/${docId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ latitude, longitude, ...(address ? { address } : {}) }),
      });
    } catch (e) {
      // ne rien afficher à l'utilisateur, silencieux
    }
  };

  const loadMechanics = async () => {
    try {
      setLoading(true);
      const list = await api.mechanics.list();

      // list is an array of mechanics documents (server model). Map to Profile shape.
      const resolveName = (source: any, primaryKeys: string[], fallback: string | undefined): string => {
        for (const key of primaryKeys) {
          const value = source?.[key];
          if (typeof value === 'string' && value.trim().length > 0) {
            return value.trim();
          }
        }
        return fallback ?? '';
      };

      let mapped: Profile[] = (Array.isArray(list) ? list : []).map((m: any) => ({
        id: m._id || m.id,
        user_type: 'mechanic',
        first_name: resolveName(m.user, ['firstName', 'first_name', 'prenom'], resolveName(m, ['firstName', 'first_name', 'prenom'], 'Mécano')),
        last_name: resolveName(m.user, ['lastName', 'last_name', 'nom'], resolveName(m, ['lastName', 'last_name', 'nom'], '')),
        phone: m.user?.phoneNumber || m.phoneNumber || '',
        address: m.address || m.user?.address || '',
        photo_url: m.user?.profilePhoto || undefined,
        id_card_number: m.nationalId,
        specialties: normalizeMechanicSpecialties(m),
        is_available: (m.is_available ?? m.available) ?? true,
        rating_average: m.rating_average ?? 0,
        rating_count: m.rating_count ?? 0,
        latitude: m.latitude ?? 0,
        longitude: m.longitude ?? 0,
        is_blocked: false,
        created_at: m.createdAt || new Date().toISOString(),
        updated_at: m.updatedAt || new Date().toISOString(),
      }));

      const normalizedSelectedType = selectedType ? normalizeSpecialty(selectedType) : null;

      mapped = mapped.filter((p) => p.is_available !== false);
      if (selectedType) {
        mapped = mapped.filter((p) =>
          (p.specialties || []).some((spec) => normalizeSpecialty(spec) === normalizedSelectedType),
        );
      }

      mapped.sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0));
      setMechanics(mapped);
    } catch (error) {
      console.error('Error loading mechanics:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMechanics = useMemo(() => {
    const query = searchQuery.trim();
    if (!query) {
      return mechanics;
    }
    const normalizedQuery = normalizeSpecialty(query);

    return mechanics.filter((mechanic) => {
      const fullName = `${mechanic.first_name || ''} ${mechanic.last_name || ''}`;
      const normalizedName = normalizeSpecialty(fullName);
      const normalizedSpecialties = (mechanic.specialties || [])
        .map((spec) => normalizeSpecialty(spec))
        .join(' ');
      const normalizedAddress = normalizeSpecialty(mechanic.address || '');

      return (
        normalizedName.includes(normalizedQuery) ||
        normalizedSpecialties.includes(normalizedQuery) ||
        normalizedAddress.includes(normalizedQuery)
      );
    });
  }, [mechanics, searchQuery]);

  const closeRequestModal = () => {
    setRequestModalVisible(false);
    setSelectedMechanic(null);
    setRequestDescription('');
    setRequestError(null);
  };

  const handleRequestService = async (mechanic: Profile) => {
    const docId = await fetchClientDocId();
    if (!docId) {
      Alert.alert(
        'Profil client introuvable',
        'Impossible de récupérer votre profil client. Veuillez réessayer plus tard.',
      );
      return;
    }
    if (!coords) {
      Alert.alert(
        'Localisation requise',
        'Veuillez activer la localisation pour envoyer une demande de dépannage.',
      );
      return;
    }

    setSelectedMechanic(mechanic);
    setRequestDescription((prev) => prev || (selectedType ? `Panne ${selectedType.toLowerCase()}` : ''));
    setRequestError(null);
    setRequestModalVisible(true);
  };

  const submitBreakdownRequest = async () => {
    if (!selectedMechanic) return;
    const description = requestDescription.trim();
    if (!description) {
      setRequestError('Décrivez brièvement la panne.');
      return;
    }
    const docId = await fetchClientDocId();
    if (!docId || !coords) {
      setRequestError('Profil client ou localisation indisponible.');
      return;
    }

    try {
      setRequestSubmitting(true);
      const headers = await getAuthHeaders();
      const payload: Record<string, any> = {
        client: docId,
        mechanic: selectedMechanic.id,
        description,
        latitude: coords.lat,
        longitude: coords.lng,
        status: 'open',
      };

      const response = await fetch(`${API_URL}/api/breakdowns`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Erreur lors de la création de la panne.' }));
        throw new Error(error.message || 'Erreur lors de la création de la panne.');
      }

      const data = await response.json();
      Alert.alert(
        'Demande envoyée',
        `Votre panne a été transmise à ${selectedMechanic.first_name} ${selectedMechanic.last_name}.`,
      );
      console.log('Breakdown created:', data);
      closeRequestModal();
    } catch (error: any) {
      setRequestError(error.message || 'Erreur inattendue.');
    } finally {
      setRequestSubmitting(false);
    }
  };

  const connectSocket = useCallback(async () => {
    try {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;
      const socket = io(API_URL.replace('/api', ''), {
        auth: { token },
        transports: ['websocket'],
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('Socket client connecté');
      });

      socket.on('breakdown_assigned', (payload: any) => {
        try {
          const { breakdown, mechanic, distanceKm, etaMinutes } = payload;
          if (!breakdown || !mechanic) return;
          setActiveMission({ breakdown, mechanic, distanceKm, etaMinutes });
          setMissionModalVisible(true);
        } catch (error) {
          console.warn('Erreur breakdown_assigned:', error);
        }
      });

      socket.on('disconnect', () => {
        console.log('Socket client déconnecté');
      });
    } catch (error) {
      console.warn('Impossible de connecter socket client:', error);
    }
  }, []);

  useEffect(() => {
    connectSocket();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [connectSocket]);

  const resetMissionState = () => {
    setActiveMission(null);
    setMissionModalVisible(false);
    setRatingValue(5);
    setRatingComment('');
    setReportReasons([]);
    setOtherReason('');
    setReportModalVisible(false);
    setSubmittingMissionAction(false);
    setRatingPromptVisible(false);
    setRatingModalVisible(false);
  };

  const submitRating = useCallback(async () => {
    if (!activeMission?.breakdown?._id || !activeMission?.mechanic?._id) return;
    try {
      setSubmittingMissionAction(true);
      const headers = await getAuthHeaders();
      const clientDocId = await fetchClientDocId();
      if (!clientDocId) {
        Alert.alert('Profil client introuvable', 'Impossible de retrouver votre fiche client.');
        setSubmittingMissionAction(false);
        return;
      }

      const payload = {
        client: clientDocId,
        mechanic: activeMission.mechanic._id || activeMission.mechanic.id,
        breakdown: activeMission.breakdown._id || activeMission.breakdown.id,
        rating: ratingValue,
        comment: ratingComment.trim() || undefined,
      };

      const res = await fetch(`${API_URL}/api/reviews`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Impossible d’enregistrer la note.' }));
        throw new Error(err.message || 'Erreur lors de l’enregistrement.');
      }

      await fetch(`${API_URL}/api/breakdowns/${activeMission.breakdown._id || activeMission.breakdown.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'closed', closedAt: new Date().toISOString() }),
      });

      resetMissionState();
      Alert.alert('Merci', 'Votre avis a été enregistré.');
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de soumettre la note.');
      setSubmittingMissionAction(false);
    }
  }, [API_URL, activeMission, fetchClientDocId, getAuthHeaders, ratingComment, ratingValue]);

  const submitReport = useCallback(async () => {
    if (!activeMission?.breakdown?._id) return;
    try {
      setSubmittingMissionAction(true);
      const headers = await getAuthHeaders();
      const clientDocId = await fetchClientDocId();
      if (!clientDocId) {
        Alert.alert('Profil client introuvable', 'Impossible de retrouver votre fiche client.');
        setSubmittingMissionAction(false);
        return;
      }

      const reasons = [...reportReasons];
      const custom = otherReason.trim();
      if (custom) reasons.push(custom);
      if (reasons.length === 0) {
        Alert.alert('Signalement', 'Veuillez sélectionner au moins un motif.');
        setSubmittingMissionAction(false);
        return;
      }

      await fetch(`${API_URL}/api/complaints`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          user: clientDocId,
          breakdown: activeMission.breakdown._id || activeMission.breakdown.id,
          description: reasons.join(' | '),
          status: 'open',
        }),
      });

      resetMissionState();
      Alert.alert('Signalement envoyé', 'Votre signalement a bien été transmis à l’administrateur.');
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de soumettre le signalement.');
      setSubmittingMissionAction(false);
    }
  }, [API_URL, activeMission, fetchClientDocId, getAuthHeaders, otherReason, reportReasons]);

  const renderMissionModal = () => {
    if (!activeMission) return null;
    const mechanicUser = activeMission.mechanic?.user || activeMission.mechanic;
    const fullName = [mechanicUser?.firstName, mechanicUser?.lastName].filter(Boolean).join(' ') || 'Mécanicien';
    const photo = mechanicUser?.profilePhoto;

    return (
      <Modal visible={missionModalVisible} transparent animationType="slide" onRequestClose={resetMissionState}>
        <View style={styles.modalOverlay}>
          <View style={styles.missionModal}>
            <Text style={styles.modalTitle}>Mécanicien en route</Text>
            <View style={styles.mechanicInfoRow}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.mechanicPhoto} />
              ) : (
                <View style={styles.mechanicFallback}>
                  <Text style={styles.mechanicFallbackText}>{fullName.slice(0, 2).toUpperCase()}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.mechanicName}>{fullName}</Text>
                {mechanicUser?.phoneNumber ? (
                  <Text style={styles.mechanicPhone}>{mechanicUser.phoneNumber}</Text>
                ) : null}
              </View>
            </View>

            <View style={styles.missionStats}>
              <View style={styles.statBlock}>
                <Text style={styles.statBlockLabel}>Distance</Text>
                <Text style={styles.statBlockValue}>{activeMission.distanceKm ? `${activeMission.distanceKm.toFixed(1)} km` : '—'}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBlock}>
                <Text style={styles.statBlockLabel}>Durée estimée</Text>
                <Text style={styles.statBlockValue}>{activeMission.etaMinutes ? `${Math.round(activeMission.etaMinutes)} min` : '—'}</Text>
              </View>
            </View>

            <View style={styles.missionActions}>
              <TouchableOpacity
                style={[styles.continueButton, submittingMissionAction && styles.disabledButton]}
                disabled={submittingMissionAction}
                onPress={() => setMissionModalVisible(false)}
              >
                <Text style={styles.continueButtonText}>Fermer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.completeButton, submittingMissionAction && styles.disabledButton]}
                disabled={submittingMissionAction}
                onPress={() => {
                  setMissionModalVisible(false);
                  setRatingPromptVisible(true);
                }}
              >
                <Text style={styles.completeButtonText}>Terminer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelButton, submittingMissionAction && styles.disabledButton]}
                disabled={submittingMissionAction}
                onPress={() => setReportModalVisible(true)}
              >
                <Text style={styles.cancelButtonText}>Signalement</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderReportModal = () => (
    <Modal visible={reportModalVisible} transparent animationType="fade" onRequestClose={() => setReportModalVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.reportModal}>
          <Text style={styles.modalTitle}>Signaler un problème</Text>
          <Text style={styles.sectionSubtitle}>Motifs</Text>
          <View style={styles.checkboxList}>
            {DEFAULT_CANCEL_REASONS.map((reason: string) => {
              const checked = reportReasons.includes(reason);
              return (
                <TouchableOpacity
                  key={reason}
                  style={styles.checkboxRow}
                  onPress={() => {
                    setReportReasons((prev: string[]) =>
                      checked ? prev.filter((r: string) => r !== reason) : [...prev, reason],
                    );
                  }}
                >
                  <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                    {checked ? <Text style={styles.checkboxMark}>✓</Text> : null}
                  </View>
                  <Text style={styles.checkboxLabel}>{reason}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TextInput
            style={styles.commentInput}
            placeholder="Autre motif (optionnel)"
            value={otherReason}
            onChangeText={setOtherReason}
            multiline
          />
          <View style={styles.missionActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setReportModalVisible(false)}>
              <Text style={styles.cancelButtonText}>Fermer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.completeButton, submittingMissionAction && styles.disabledButton]}
              disabled={submittingMissionAction}
              onPress={submitReport}
            >
              <Text style={styles.completeButtonText}>Envoyer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderRatingPrompt = () => (
    <Modal visible={ratingPromptVisible && !!activeMission} transparent animationType="fade" onRequestClose={() => setRatingPromptVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.promptModal}>
          <Text style={styles.modalTitle}>Merci d'avoir utilisé TerangaAuto</Text>
          <Text style={styles.modalSubtitle}>Souhaitez-vous laisser une note pour ce mécanicien ?</Text>
          <View style={styles.promptActions}>
            <TouchableOpacity
              style={[styles.cancelButton, styles.promptButton]}
              onPress={resetMissionState}
            >
              <Text style={styles.cancelButtonText}>Plus tard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.completeButton, styles.promptButton]}
              onPress={() => {
                setRatingPromptVisible(false);
                setRatingModalVisible(true);
              }}
            >
              <Text style={styles.completeButtonText}>Noter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderRatingModal = () => (
    <Modal visible={ratingModalVisible && !!activeMission} transparent animationType="fade" onRequestClose={() => setRatingModalVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.ratingModal}>
          <Text style={styles.modalTitle}>Votre avis</Text>
          <Text style={styles.modalSubtitle}>Quelle note souhaitez-vous attribuer ?</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((value) => (
              <TouchableOpacity key={value} onPress={() => setRatingValue(value)}>
                <Text style={[styles.star, value <= ratingValue ? styles.starActive : styles.starInactive]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.commentInput}
            placeholder="Commentaire (optionnel)"
            value={ratingComment}
            onChangeText={setRatingComment}
            multiline
          />
          <View style={styles.promptActions}>
            <TouchableOpacity
              style={[styles.cancelButton, styles.promptButton]}
              onPress={resetMissionState}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.completeButton, styles.promptButton, submittingMissionAction && styles.disabledButton]}
              disabled={submittingMissionAction}
              onPress={submitRating}
            >
              <Text style={styles.completeButtonText}>Envoyer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton}>
          <Menu color="#000" size={24} />
        </TouchableOpacity>
      <View style={styles.headerCenter}>
  <Text style={styles.logo}>TerangaAuto</Text>
  <TouchableOpacity style={styles.location} onPress={openMap} activeOpacity={0.8}>
    <Text style={styles.locationPillText}>{locationText || 'Votre position'}</Text>
   
  </TouchableOpacity>
</View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerButton}>
            <Bell color="#000" size={24} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadMechanics} />
        }
      >
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeText}>
            Bonjour, {profile?.first_name} !
          </Text>
          <Text style={styles.welcomeSubtext}>
            Trouvez un mécanicien près de chez vous
          </Text>
        </View>

        <Animated.View
          style={[
            styles.section,
            {
              opacity: servicesAnimation,
              transform: [
                {
                  translateY: servicesAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [24, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>Services de dépannage</Text>
          <FlatList
            data={MECHANIC_TYPES}
            keyExtractor={(item) => item.label}
            numColumns={4}
            scrollEnabled={false}
            contentContainerStyle={styles.servicesGrid}
            columnWrapperStyle={styles.serviceRow}
            renderItem={({ item }) => {
              const Icon = item.icon;
              const isSelected = selectedType === item.label;
              return (
                <TouchableOpacity
                  style={[
                    styles.serviceCard,
                    isSelected && styles.serviceCardSelected,
                  ]}
                  onPress={() =>
                    setSelectedType(isSelected ? null : item.label)
                  }
                >
                  <View
                    style={[
                      styles.serviceIcon,
                      { backgroundColor: item.color + '20' },
                    ]}
                  >
                    <Icon color={item.color} size={24} />
                  </View>
                  <Text style={styles.serviceLabel}>{item.label}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </Animated.View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mécaniciens disponibles</Text>
          <View style={styles.searchContainer}>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Rechercher un mécanicien"
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
              returnKeyType="search"
            />
          </View>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#007AFF" />
            </View>
          ) : filteredMechanics.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {searchQuery.trim()
                  ? 'Aucun mécanicien ne correspond à votre recherche'
                  : 'Aucun mécanicien disponible'}
              </Text>
            </View>
          ) : (
            filteredMechanics.map((mechanic) => (
              <View key={mechanic.id} style={styles.mechanicCard}>
                <View style={styles.mechanicHeader}>
                  <View style={styles.mechanicAvatar}>
                    {mechanic.photo_url ? (
                      <Image
                        source={{ uri: mechanic.photo_url }}
                        style={styles.mechanicAvatarImage}
                      />
                    ) : (
                      <Text style={styles.mechanicAvatarText}>
                        {mechanic.first_name[0]}
                        {mechanic.last_name[0]}
                      </Text>
                    )}
                  </View>
                  <View style={styles.mechanicInfo}>
                    <Text style={styles.mechanicName}>
                      {mechanic.first_name} {mechanic.last_name}
                    </Text>
                    <View style={styles.mechanicRating}>
                      <Text style={styles.mechanicRatingText}>
                        ⭐ {mechanic.rating_average.toFixed(1)}
                      </Text>
                      <Text style={styles.mechanicRatingCount}>
                        ({mechanic.rating_count} avis)
                      </Text>
                    </View>
                    <Text style={styles.mechanicSpecialties}>
                      {mechanic.specialties?.join(', ')}
                    </Text>
                    {mechanic.address ? (
                      <Text style={styles.mechanicAddress}>{mechanic.address}</Text>
                    ) : null}
                    {typeof mechanic.latitude === 'number' && typeof mechanic.longitude === 'number' && (mechanic.latitude !== 0 || mechanic.longitude !== 0) ? (
                      <Text style={styles.mechanicLocation}>
                        Lat. {mechanic.latitude.toFixed(4)} · Lon. {mechanic.longitude.toFixed(4)}
                      </Text>
                    ) : (
                      <Text style={styles.mechanicLocationPending}>
                        Coordonnées en attente
                      </Text>
                    )}
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      mechanic.is_available && styles.statusBadgeAvailable,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        mechanic.is_available && styles.statusTextAvailable,
                      ]}
                    >
                      {mechanic.is_available ? 'Disponible' : 'Occupé'}
                    </Text>
                  </View>
                </View>
                <View style={styles.mechanicActions}>
                  <TouchableOpacity style={styles.actionButton}>
                    <MessageCircle color="#007AFF" size={20} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.requestButton}
                    onPress={() => handleRequestService(mechanic)}
                  >
                    <Text style={styles.requestButtonText}>
                      Demander un service
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Bouton flottant pour la messagerie */}
      <TouchableOpacity
        style={[styles.floatingButton, { backgroundColor: '#0A1F44' }]}
        onPress={() => router.push('/(client)/(tabs)/messages' as any)}
        activeOpacity={0.8}
      >
        <MessageCircle size={28} color="#22C55E" />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent
        visible={requestModalVisible}
        onRequestClose={closeRequestModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Décrire la panne</Text>
            {selectedType ? (
              <Text style={styles.modalSubtitle}>Service : {selectedType}</Text>
            ) : null}
            {selectedMechanic ? (
              <Text style={styles.modalSubtitle}>
                Mécanicien : {selectedMechanic.first_name} {selectedMechanic.last_name}
              </Text>
            ) : null}
            <TextInput
              style={[styles.modalInput, requestError && styles.modalInputError]}
              placeholder="Ex: Panne moteur sur la VDN"
              multiline
              numberOfLines={4}
              value={requestDescription}
              onChangeText={(text) => {
                setRequestDescription(text);
                if (requestError) setRequestError(null);
              }}
              editable={!requestSubmitting}
            />
            {requestError ? (
              <Text style={styles.modalError}>{requestError}</Text>
            ) : null}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={closeRequestModal}
                disabled={requestSubmitting}
              >
                <Text style={styles.modalButtonSecondaryText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={submitBreakdownRequest}
                disabled={requestSubmitting}
              >
                {requestSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Envoyer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {renderMissionModal()}
      {renderReportModal()}
      {renderRatingPrompt()}
      {renderRatingModal()}
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
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerButton: {
    padding: 8,
  },
  headerCenter: {
    alignItems: 'center',
  },
  logo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  location: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  locationPillText: {
    fontSize: 12,
    color: '#666',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  content: {
    flex: 1,
  },
  welcomeCard: {
    backgroundColor: '#007AFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 16,
    marginBottom: 12,
    color: '#000',
  },
  servicesGrid: {
    paddingHorizontal: 16,
  },
  serviceRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  serviceCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginHorizontal: 6,
  },
  serviceCardSelected: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  serviceIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  serviceLabel: {
    fontSize: 11,
    textAlign: 'center',
    color: '#333',
  },
  mechanicCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
  },
  mechanicHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  mechanicAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  mechanicAvatarImage: {
    width: '100%',
    height: '100%',
  },
  mechanicAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  mechanicInfo: {
    flex: 1,
  },
  mechanicName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  mechanicRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  mechanicRatingText: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  mechanicRatingCount: {
    fontSize: 12,
    color: '#666',
  },
  mechanicSpecialties: {
    fontSize: 12,
    color: '#666',
  },
  mechanicAddress: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 4,
  },
  mechanicLocation: {
    marginTop: 4,
    fontSize: 12,
    color: '#1E3A8A',
    fontWeight: '500',
  },
  mechanicLocationPending: {
    marginTop: 4,
    fontSize: 12,
    color: '#9CA3AF',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#FFE5E5',
    alignSelf: 'flex-start',
  },
  statusBadgeAvailable: {
    backgroundColor: '#E5F5E5',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF3B30',
  },
  statusTextAvailable: {
    color: '#34C759',
  },
  mechanicActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  requestButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    marginVertical: 12,
    marginHorizontal: 4,
  },
  searchInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 14,
    fontSize: 14,
    backgroundColor: '#fff',
    color: '#111827',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  missionModal: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  mechanicInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mechanicPhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  mechanicFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0A1F44',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mechanicFallbackText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  mechanicPhone: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 2,
  },
  missionStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
  },
  statBlockLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  statBlockValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  statDivider: {
    width: 1,
    height: '70%',
    backgroundColor: '#CBD5F5',
  },
  missionActions: {
    flexDirection: 'row',
    gap: 10,
  },
  continueButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5F5',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    color: '#1E40AF',
    fontSize: 14,
    fontWeight: '600',
  },
  completeButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#16A34A',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  ratingHint: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
  },
  ratingHintText: {
    fontSize: 13,
    color: '#312E81',
    textAlign: 'center',
  },
  promptModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    width: '90%',
    maxWidth: 420,
  },
  ratingModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    width: '90%',
    maxWidth: 420,
  },
  promptActions: {
    flexDirection: 'row',
    gap: 12,
  },
  promptButton: {
    flex: 1,
  },
  disabledButton: {
    opacity: 0.6,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A1F44',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  star: {
    fontSize: 28,
  },
  starActive: {
    color: '#F59E0B',
  },
  starInactive: {
    color: '#CBD5F5',
  },
  commentInput: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    textAlignVertical: 'top',
    color: '#0F172A',
  },
  reportModal: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  checkboxList: {
    gap: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CBD5F5',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF',
  },
  checkboxMark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0A1F44',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#4B5563',
  },
  modalInput: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#111827',
  },
  modalInputError: {
    borderColor: '#F87171',
  },
  modalError: {
    fontSize: 12,
    color: '#DC2626',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    minWidth: 110,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalButtonSecondary: {
    backgroundColor: '#E5E7EB',
  },
  modalButtonSecondaryText: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '500',
  },
});

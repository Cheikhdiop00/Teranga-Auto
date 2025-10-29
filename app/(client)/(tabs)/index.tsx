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
  Switch,
  Platform,
  TouchableWithoutFeedback,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
  MapPin,
  Star,
  Phone,
  Mail,
  Navigation,
  UserRound,
  Sun,
  Moon,
  Info,
  AlertTriangle,
  LogOut,
  X,
  Sparkles,
  Search,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { api } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/config/api';
import { Profile } from '@/types/database';
import { io, Socket } from 'socket.io-client';
import IconImage from '@/assets/images/Icon.jpg';
import { useClientTheme } from '@/contexts/ClientThemeContext';
import type { ClientThemeColors } from '@/contexts/ClientThemeContext';

type MechanicListItem = Profile & { userId?: string };

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

const defaultReportReasons = DEFAULT_CANCEL_REASONS;

export default function ClientHomeScreen() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const { isDarkMode, toggleTheme, colors } = useClientTheme();
  const [mechanics, setMechanics] = useState<MechanicListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const servicesAnimation = useRef(new Animated.Value(0)).current;
  const [locationText, setLocationText] = useState<string>('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [clientDocId, setClientDocId] = useState<string | null>(null);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [selectedMechanic, setSelectedMechanic] = useState<MechanicListItem | null>(null);
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [emergencyModalVisible, setEmergencyModalVisible] = useState(false);
  const menuProgress = useRef(new Animated.Value(0)).current;
  const drawerWidth = Math.min(Dimensions.get('window').width * 0.65, 260);
  const menuTranslate = menuProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-drawerWidth, 0],
  });
  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);
  const menuTheme = useMemo(
    () => ({
      background: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      overlay: colors.overlay,
    }),
    [colors],
  );

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
    Animated.timing(menuProgress, {
      toValue: isMenuOpen ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [isMenuOpen, menuProgress]);

  const handleToggleTheme = () => {
    toggleTheme();
  };

  const emergencyContacts = useMemo(
    () => [
      { label: 'Police nationale', number: '17' },
      { label: 'Gendarmerie', number: '800201251' },
      { label: 'Sapeurs-pompiers', number: '18' },
      { label: 'SAMU (Urgence médicale)', number: '800000707' },
      { label: 'Sénécartes Assistance', number: '33 889 15 66' },
    ],
    [],
  );

  const handleOpenUrgence = () => {
    setEmergencyModalVisible(true);
    setIsMenuOpen(false);
  };

  const closeEmergencyModal = () => {
    setEmergencyModalVisible(false);
  };

  const handleCallEmergency = async (number: string) => {
    try {
      const sanitized = number.replace(/\s+/g, '');
      const url = `tel:${sanitized}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Appel impossible', `Veuillez composer le ${number} depuis votre téléphone.`);
      }
    } catch {
      Alert.alert('Appel impossible', `Veuillez composer le ${number} depuis votre téléphone.`);
    }
  };

  const handleAbout = () => {
    setIsMenuOpen(false);
    Alert.alert('À propos', "Teranga Auto – Assistance mécanique 24/7.");
  };

  const handleSignOut = async () => {
    setIsMenuOpen(false);
    await signOut();
    router.replace('/auth/login');
  };

  useEffect(() => {
    (async () => {
      const applyPosition = async (latitude: number, longitude: number) => {
        setCoords({ lat: latitude, lng: longitude });
        let label = `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`;
        let address: string | undefined;
        try {
          const places = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (places && places.length > 0) {
            const p = places[0];
            const city = p.city || p.subregion || p.region || '';
            const country = p.country || '';
            const composed = [city, country].filter(Boolean).join(', ');
            if (composed) {
              label = composed;
              address = composed;
            }
          }
        } catch {
          // Ignorer les erreurs de géocodage inversé
        }
        setLocationText(label);
        await saveLocation({
          latitude,
          longitude,
          address,
        });
      };

      const fallbackToLastKnown = async () => {
        try {
          const last = await Location.getLastKnownPositionAsync();
          if (last?.coords) {
            await applyPosition(last.coords.latitude, last.coords.longitude);
            return true;
          }
        } catch {
          // Ignorer les erreurs de récupération de la dernière position connue
        }
        return false;
      };

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationText('Localisation désactivée');
          return;
        }

        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          const usedLast = await fallbackToLastKnown();
          if (!usedLast) {
            setLocationText('Activez le GPS.');
          }
          return;
        }

        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (pos?.coords) {
          await applyPosition(pos.coords.latitude, pos.coords.longitude);
          return;
        }

        const usedLast = await fallbackToLastKnown();
        if (!usedLast) {
          setLocationText('Localisation indisponible');
        }
      } catch {
        const usedLast = await fallbackToLastKnown();
        if (!usedLast) {
          setLocationText('Localisation indisponible');
        }
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

      const normalizeList = (value: any): string[] => {
        if (Array.isArray(value)) return value.map((v) => String(v));
        if (typeof value === 'string' && value.trim()) return value.split(/[,;]+/).map((item) => item.trim());
        return [];
      };

      let mapped: MechanicListItem[] = (Array.isArray(list) ? list : []).map((m: any) => ({
        id: m._id || m.id,
        user_type: 'mechanic',
        first_name: resolveName(m.user, ['firstName', 'first_name', 'prenom'], resolveName(m, ['firstName', 'first_name', 'prenom'], 'Mécano')),
        last_name: resolveName(m.user, ['lastName', 'last_name', 'nom'], resolveName(m, ['lastName', 'last_name', 'nom'], '')),
        phone: m.user?.phoneNumber || m.phoneNumber || '',
        address: m.address || m.user?.address || '',
        photo_url: m.user?.profilePhoto || undefined,
        id_card_number: m.nationalId,
        specialties: normalizeList(m.specialties ?? normalizeMechanicSpecialties(m)),
        is_available: (m.is_available ?? m.available) ?? true,
        rating_average: m.rating_average ?? m.reputation ?? 0,
        rating_count: m.rating_count ?? m.interventionsCount ?? 0,
        latitude: m.latitude ?? 0,
        longitude: m.longitude ?? 0,
        is_blocked: false,
        created_at: m.createdAt || new Date().toISOString(),
        updated_at: m.updatedAt || new Date().toISOString(),
        userId: m.user?._id || m.user?.id || m.userId || undefined,
      }));

      const normalizedSelectedType = selectedType ? normalizeSpecialty(selectedType) : null;

      mapped = mapped.filter((p) => p.is_available !== false);
      if (selectedType) {
        mapped = mapped.filter((p) =>
          (p.specialties || []).some((spec) => normalizeSpecialty(spec) === normalizedSelectedType),
        );
      }

      mapped.sort((a, b) => {
        const diff = (b.rating_average || 0) - (a.rating_average || 0);
        if (Math.abs(diff) > 0.01) return diff;
        return (b.rating_count || 0) - (a.rating_count || 0);
      });
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

  const handleRequestService = async (mechanic: MechanicListItem) => {
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

  const navigateToConversationWithParticipant = useCallback(
    async (participantId?: string | null) => {
      try {
        if (!participantId) {
          Alert.alert(
            'Discussion impossible',
            'Impossible de trouver le compte du mécanicien. Réessayez plus tard.',
          );
          return;
        }

        const token = await AsyncStorage.getItem('authToken');
        if (!token) {
          Alert.alert(
            'Connexion requise',
            'Veuillez vous reconnecter pour démarrer une discussion avec le mécanicien.',
          );
          return;
        }

        const res = await fetch(`${API_URL}/api/messages/conversations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ participantId }),
        });

        if (!res.ok) {
          const error = await res.json().catch(() => ({}));
          throw new Error(error.message || 'Impossible de démarrer la conversation.');
        }

        const data = await res.json();
        const payload = data?.data ?? data;
        const conversationId = payload?._id || payload?.id || payload?.conversationId;
        if (!conversationId) {
          Alert.alert(
            'Discussion créée',
            'Conversation démarrée, mais impossible de récupérer son identifiant.',
          );
          return;
        }

        router.push(`/(client)/chat/${conversationId}` as any);
      } catch (error: any) {
        Alert.alert('Discussion impossible', error.message || 'Erreur inattendue.');
      }
    },
    [API_URL, router],
  );

  const startConversationWithMechanic = async (mechanic: MechanicListItem) => {
    const participantId = mechanic.userId || mechanic.id;
    await navigateToConversationWithParticipant(participantId);
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
              <TouchableOpacity key={value} onPress={() => setRatingValue(value)} activeOpacity={0.7}>
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

  const renderServiceCard = useCallback(
    ({ item }: { item: (typeof MECHANIC_TYPES)[number] }) => {
      const IconComponent = item.icon;
      const isSelected = selectedType === item.label;
      return (
        <TouchableOpacity
          style={[styles.serviceCard, isSelected && styles.serviceCardSelected]}
          onPress={() => setSelectedType(isSelected ? null : item.label)}
          activeOpacity={0.85}
        >
          <View style={[styles.serviceIcon, { backgroundColor: `${item.color}1A` }]}>
            <IconComponent color={item.color} size={24} />
          </View>
          <Text style={styles.serviceLabel}>{item.label}</Text>
        </TouchableOpacity>
      );
    },
    [selectedType, styles],
  );

  return (
    <SafeAreaView style={styles.container}>
      {isMenuOpen ? (
        <TouchableWithoutFeedback onPress={() => setIsMenuOpen(false)}>
          <Animated.View style={[styles.drawerOverlay, { opacity: menuProgress }]}>
            <Animated.View
              style={[styles.drawerContainer, { width: drawerWidth, transform: [{ translateX: menuTranslate }] }]}
            >
              <LinearGradient
                colors={['rgba(15,23,42,0.95)', 'rgba(10,18,35,0.85)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.drawer}
              >
                <View style={styles.drawerHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Image source={IconImage} style={styles.drawerLogo} />
                    <View style={styles.drawerHeaderTexts}>
                      <Text style={[styles.drawerTitle, { color: '#fff' }]}>Menu client</Text>
                      <Text style={[styles.drawerSubtitle, { color: '#fff' }]}>Accès rapide</Text>
                    </View>
                  </View>
                </View>

              <View style={styles.drawerMenu}>
                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => {
                    setIsMenuOpen(false);
                    router.push('/(client)/profile' as any);
                  }}
                >
                  <View style={styles.drawerItemLeft}>
                    <UserRound color="#fff" size={20} />
                    <Text style={[styles.drawerItemText, { color: '#fff' }]}>Mon profil</Text>
                  </View>
                  <ChevronRight color="#fff" size={18} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.drawerItem} onPress={handleOpenUrgence}>
                  <View style={styles.drawerItemLeft}>
                    <AlertTriangle color="#fff" size={20} />
                    <Text style={[styles.drawerItemText, { color: '#fff' }]}>Urgence</Text>
                  </View>
                  <ChevronRight color="#fff" size={18} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => {
                    setIsMenuOpen(false);
                    router.push('/(client)/support' as any);
                  }}
                >
                  <View style={styles.drawerItemLeft}>
                    <Info color="#fff" size={20} />
                    <Text style={[styles.drawerItemText, { color: '#fff' }]}>Support</Text>
                  </View>
                  <ChevronRight color="#fff" size={18} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => handleToggleTheme()}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={isDarkMode ? 'Désactiver le thème sombre' : 'Activer le thème sombre'}
                >
                  <View style={styles.drawerItemLeft}>
                    {isDarkMode ? (
                      <Moon color="#fff" size={20} />
                    ) : (
                      <Sun color="#fff" size={20} />
                    )}
                    <Text style={[styles.drawerItemText, { color: '#fff' }]}>
                      {isDarkMode ? 'Thème sombre' : 'Thème clair'}
                    </Text>
                  </View>
                  <Switch
                    value={isDarkMode}
                    onValueChange={handleToggleTheme}
                    thumbColor="#ffffff"
                    trackColor={{ false: '#E2E8F0', true: '#34C759' }}
                    ios_backgroundColor="#E2E8F0"
                    style={styles.drawerSwitch}
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.drawerLogoutButton} onPress={handleSignOut} activeOpacity={0.85}>
                  <LogOut color="#0A84FF" size={18} />
                  <Text style={styles.drawerLogoutText}>Se déconnecter</Text>
                </TouchableOpacity>
              </View>
              </LinearGradient>
            </Animated.View>
          </Animated.View>
        </TouchableWithoutFeedback>
      ) : null}

      <Modal visible={emergencyModalVisible} animationType="slide" transparent onRequestClose={closeEmergencyModal}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.emergencyModal, { backgroundColor: colors.surface }]}> 
            <View style={styles.emergencyHeader}>
              <Text style={[styles.emergencyTitle, { color: colors.textPrimary }]}>Urgences Sénégal</Text>
              <TouchableOpacity onPress={closeEmergencyModal} style={styles.emergencyClose}>
                <X color={colors.textSecondary} size={20} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.emergencySubtitle, { color: colors.textSecondary }]}>Sélectionnez un numéro pour appeler immédiatement.</Text>
            <View style={styles.emergencyList}>
              {emergencyContacts.map((contact) => (
                <TouchableOpacity
                  key={contact.number}
                  style={[styles.emergencyItem, { borderColor: colors.border }]}
                  onPress={() => handleCallEmergency(contact.number)}
                  activeOpacity={0.85}
                >
                  <View>
                    <Text style={[styles.emergencyItemLabel, { color: colors.textPrimary }]}>{contact.label}</Text>
                    <Text style={[styles.emergencyItemNumber, { color: colors.textSecondary }]}>{contact.number}</Text>
                  </View>
                  <Phone color={colors.accent} size={20} />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.emergencyFooterBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
              onPress={closeEmergencyModal}
            >
              <Text style={[styles.emergencyFooterText, { color: colors.textPrimary }]}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setIsMenuOpen(true)}
          accessibilityLabel="Ouvrir le menu client"
        >
          <Menu color={colors.accentContrast} size={24} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.logo}>TerangaAuto</Text>
          <TouchableOpacity style={styles.location} onPress={openMap} activeOpacity={0.8}>
            <View style={styles.locationRow}>
              <MapPin size={14} color={colors.accent} />
              <Text style={styles.locationPillText}>{locationText || 'Votre position'}</Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/(client)/messages' as any)}
            accessibilityLabel="Accéder aux notifications"
          >
            <Bell color={colors.accentContrast} size={24} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadMechanics}
            tintColor={colors.accent}
            colors={[colors.accent]}
            titleColor={colors.textPrimary}
          />
        }
      >
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeText}>Bonjour, {profile?.first_name || 'Client'} !</Text>
          <Text style={styles.welcomeSubtext}>Trouvez un mécanicien près de chez vous</Text>
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
                    outputRange: [16, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderTitle}>
              <Text style={styles.sectionTitle}>Services de dépannage</Text>
              <Text style={styles.sectionDescription}>Choisissez une catégorie pour filtrer les mécaniciens.</Text>
            </View>
            {selectedType ? (
              <TouchableOpacity style={styles.clearFilterButton} onPress={() => setSelectedType(null)}>
                <Text style={styles.clearFilterLabel}>Effacer</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <FlatList
            data={MECHANIC_TYPES}
            keyExtractor={(item) => item.label}
            numColumns={4}
            scrollEnabled={false}
            renderItem={renderServiceCard}
            contentContainerStyle={styles.servicesGrid}
            columnWrapperStyle={styles.serviceRow}
          />
        </Animated.View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderAlt}>
            <View style={styles.sectionHeaderTitle}>
              <Text style={styles.sectionTitle}>Mécaniciens disponibles</Text>
              <Text style={styles.sectionDescription}>Contactez un expert proche de vous ou lancez une demande.</Text>
            </View>
          </View>
          <View style={styles.searchContainer}>
            <View style={styles.searchField}>
              <Search color={isDarkMode ? '#A5AEC0' : '#6B7280'} size={18} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Rechercher un mécanicien"
                placeholderTextColor={isDarkMode ? 'rgba(10,132,255,0.7)' : 'rgba(10,132,255,0.75)'}
                style={styles.searchInput}
                returnKeyType="search"
              />
            </View>
          </View>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.accent} />
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
                      <Image source={{ uri: mechanic.photo_url }} style={styles.mechanicAvatarImage} />
                    ) : (
                      <Text style={styles.mechanicAvatarText}>
                        {(mechanic.first_name?.[0] || 'T').toUpperCase()}
                        {(mechanic.last_name?.[0] || 'A').toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={styles.mechanicInfo}>
                    <Text style={styles.mechanicName}>
                      {mechanic.first_name} {mechanic.last_name}
                    </Text>
                    <View style={styles.mechanicRating}>
                      <Text style={styles.mechanicRatingText}>⭐ {mechanic.rating_average.toFixed(1)}</Text>
                      <Text style={styles.mechanicRatingCount}>({mechanic.rating_count} avis)</Text>
                    </View>
                    <Text style={styles.mechanicSpecialties}>
                      Spécialités : {mechanic.specialties?.length ? mechanic.specialties.join(', ') : 'Non renseigné'}
                    </Text>
                    <Text style={styles.mechanicStatsText}>Missions réalisées : {mechanic.rating_count}</Text>
                    {mechanic.address ? <Text style={styles.mechanicAddress}>{mechanic.address}</Text> : null}
                    {typeof mechanic.latitude === 'number' && typeof mechanic.longitude === 'number' && (mechanic.latitude !== 0 || mechanic.longitude !== 0) ? (
                      <Text style={styles.mechanicLocation}>Lat. {mechanic.latitude.toFixed(4)} · Lon. {mechanic.longitude.toFixed(4)}</Text>
                    ) : (
                      <Text style={styles.mechanicLocationPending}>Coordonnées en attente</Text>
                    )}
                  </View>
                  <View style={[styles.statusBadge, mechanic.is_available && styles.statusBadgeAvailable]}>
                    <Text style={[styles.statusText, mechanic.is_available && styles.statusTextAvailable]}>
                      {mechanic.is_available ? 'Disponible' : 'Occupé'}
                    </Text>
                  </View>
                </View>
                <View style={styles.mechanicActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => startConversationWithMechanic(mechanic)}
                    accessibilityLabel={`Contacter ${mechanic.first_name}`}
                  >
                    <MessageCircle color={colors.accent} size={20} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.requestButton}
                    onPress={() => handleRequestService(mechanic)}
                  >
                    <Text style={styles.requestButtonText}>Demander un service</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal
        visible={requestModalVisible && !!selectedMechanic}
        animationType="slide"
        transparent
        onRequestClose={closeRequestModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Demande de service</Text>
            <Text style={styles.modalSubtitle}>
              {selectedMechanic
                ? `Décrivez la panne pour ${selectedMechanic.first_name} ${selectedMechanic.last_name}`
                : 'Décrivez la panne'}
            </Text>
            <TextInput
              style={[styles.modalInput, requestError && styles.modalInputError]}
              placeholder="Décrivez brièvement le problème rencontré"
              placeholderTextColor={colors.textSecondary}
              value={requestDescription}
              onChangeText={(text) => {
                setRequestDescription(text);
                if (requestError) setRequestError(null);
              }}
              multiline
              editable={!requestSubmitting}
            />
            {requestError ? <Text style={styles.modalError}>{requestError}</Text> : null}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={closeRequestModal}
                disabled={requestSubmitting}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonSecondaryText]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, requestSubmitting && styles.disabledButton]}
                onPress={submitBreakdownRequest}
                disabled={requestSubmitting}
              >
                <Text style={styles.modalButtonText}>
                  {requestSubmitting ? 'Envoi...' : 'Envoyer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => router.push('/(client)/ai-assistant' as any)}
        accessibilityLabel="Ouvrir l’assistance IA"
        activeOpacity={0.85}
      >
        <Sparkles color={colors.accentContrast} size={22} />
        <Text style={styles.floatingButtonLabel}>Assistant IA</Text>
      </TouchableOpacity>

      {renderMissionModal()}
      {renderReportModal()}
      {renderRatingPrompt()}
      {renderRatingModal()}
    </SafeAreaView>
  );
}

const createStyles = (colors: ClientThemeColors, isDarkMode: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 32,
      paddingBottom: 14,
      paddingHorizontal: 16,
      backgroundColor: colors.accent,
      borderBottomWidth: 0,
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
      color: colors.accentContrast,
      marginTop: 6,
    },
    location: {
      marginTop: 6,
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderColor: 'rgba(255,255,255,0.35)',
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    locationPillText: {
      fontSize: 12,
      color: colors.accentContrast,
    },
    headerRight: {
      flexDirection: 'row',
      gap: 8,
    },
    themeSwitchContainer: {
      paddingVertical: 2,
      paddingHorizontal: 6,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.18)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      flex: 1,
    },
    welcomeCard: {
      backgroundColor: colors.accent,
      margin: 16,
      padding: 20,
      borderRadius: 12,
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 18,
      elevation: 6,
    },
    welcomeText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.accentContrast,
      marginBottom: 4,
    },
    welcomeSubtext: {
      fontSize: 14,
      color: colors.accentContrast,
      opacity: 0.9,
    },
    section: {
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginHorizontal: 16,
      marginBottom: 12,
    },
    sectionHeaderAlt: {
      marginHorizontal: 16,
      marginBottom: 12,
    },
    sectionHeaderTitle: {
      gap: 4,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#03245E',
    },
    sectionDescription: {
      fontSize: 12,
      color: '#03245E',
    },
    clearFilterButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: isDarkMode ? colors.surfaceAlt : '#F1F5FF',
    },
    clearFilterLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: '#03245E',
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
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginHorizontal: 6,
    },
    serviceCardSelected: {
      borderWidth: 2,
      borderColor: colors.accent,
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 4,
    },
    serviceIcon: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: isDarkMode ? 'rgba(77,163,255,0.15)' : '#F1F5F9',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    serviceLabel: {
      fontSize: 11,
      textAlign: 'center',
      color: colors.textPrimary,
      lineHeight: 16,
    },
    mechanicCard: {
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      marginBottom: 12,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
    },
    mechanicHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    mechanicAvatar: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.accent,
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
      color: colors.accentContrast,
    },
    mechanicInfo: {
      flex: 1,
    },
    mechanicName: {
      fontSize: 16,
      fontWeight: '600',
      color: '#03245E',
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
      color: '#03245E',
    },
    mechanicRatingCount: {
      fontSize: 12,
      color: '#03245E',
    },
    mechanicSpecialties: {
      fontSize: 12,
      color: '#03245E',
    },
    mechanicStatsText: {
      fontSize: 12,
      color: '#03245E',
      marginTop: 2,
    },
    mechanicAddress: {
      fontSize: 12,
      color: '#03245E',
      marginTop: 4,
    },
    mechanicLocation: {
      marginTop: 4,
      fontSize: 12,
      color: '#03245E',
      fontWeight: '500',
    },
    mechanicLocationPending: {
      marginTop: 4,
      fontSize: 12,
      color: '#03245E',
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      backgroundColor: isDarkMode ? 'rgba(255, 82, 82, 0.16)' : '#FFE5E5',
      alignSelf: 'flex-start',
    },
    statusBadgeAvailable: {
      backgroundColor: isDarkMode ? 'rgba(52, 199, 89, 0.18)' : '#E5F5E5',
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
      gap: 16,
      alignItems: 'center',
    },
    actionButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: isDarkMode ? colors.surfaceAlt : '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDarkMode ? colors.border : '#E5E7EB',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 1,
    },
    requestButton: {
      flex: 1,
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    requestButtonText: {
      color: colors.accentContrast,
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    loadingContainer: {
      paddingVertical: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchContainer: {
      marginVertical: 12,
      marginHorizontal: 4,
      alignItems: 'center',
    },
    searchField: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 4,
      shadowColor: '#020617',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 2,
      width: '92%',
      maxWidth: 340,
    },
    searchInput: {
      height: 36,
      borderRadius: 10,
      flex: 1,
      borderWidth: 0,
      paddingHorizontal: 0,
      fontSize: 14,
      color: colors.accent,
    },
    emptyState: {
      padding: 40,
      alignItems: 'center',
      gap: 12,
    },
    emptyStateText: {
      fontSize: 14,
      color: colors.textSecondary,
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
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 12,
      shadowColor: '#020617',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 14,
      elevation: 4,
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
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mechanicFallbackText: {
      color: colors.accentContrast,
      fontSize: 20,
      fontWeight: '700',
    },
    mechanicPhone: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    missionStats: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? colors.surfaceAlt : '#F1F5F9',
      borderRadius: 12,
      padding: 12,
      gap: 12,
    },
    statDivider: {
      width: 1,
      height: '100%',
      backgroundColor: colors.border,
      opacity: 0.4,
    },
    statBlock: {
      flex: 1,
      alignItems: 'center',
    },
    statBlockLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    statBlockValue: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.accent,
    },
    missionActions: {
      flexDirection: 'row',
      gap: 10,
    },
    continueButton: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    continueButtonText: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: '600',
    },
    completeButton: {
      flex: 1,
      borderRadius: 10,
      backgroundColor: colors.accent,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    completeButtonText: {
      color: colors.accentContrast,
      fontSize: 14,
      fontWeight: '600',
    },
    cancelButton: {
      flex: 1,
      borderRadius: 10,
      backgroundColor: colors.surfaceAlt,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelButtonText: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '600',
    },
    ratingHint: {
      marginTop: 12,
      padding: 12,
      borderRadius: 10,
      backgroundColor: isDarkMode ? 'rgba(77,163,255,0.12)' : '#EEF2FF',
    },
    ratingHintText: {
      fontSize: 13,
      color: colors.textPrimary,
      textAlign: 'center',
    },
    promptModal: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      gap: 16,
      width: '90%',
      maxWidth: 420,
    },
    ratingModal: {
      backgroundColor: colors.surface,
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
      color: colors.accent,
    },
    starsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 12,
      paddingVertical: 12,
    },
    star: {
      fontSize: 32,
      fontWeight: '700',
      marginHorizontal: 4,
    },
    starActive: {
      color: '#F59E0B',
    },
    starInactive: {
      color: colors.textSecondary,
    },
    reportModal: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: colors.surface,
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
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    checkboxChecked: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    checkboxMark: {
      color: colors.accentContrast,
      fontSize: 12,
      fontWeight: '700',
    },
    checkboxLabel: {
      fontSize: 14,
      color: colors.textPrimary,
      flex: 1,
    },
    commentInput: {
      minHeight: 100,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      textAlignVertical: 'top',
      fontSize: 14,
      backgroundColor: colors.surface,
      color: colors.textPrimary,
    },
    floatingButton: {
      position: 'absolute',
      bottom: 80,
      right: 16,
      paddingHorizontal: 20,
      height: 56,
      borderRadius: 28,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.accent,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    floatingButtonLabel: {
      color: colors.accentContrast,
      fontSize: 14,
      fontWeight: '600',
    },
    drawerOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(2, 6, 23, 0.4)',
      zIndex: 100,
    },
    drawerContainer: {
      borderRadius: 24,
      overflow: 'hidden',
      shadowColor: '#020617',
      shadowOpacity: 0.25,
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 22,
      elevation: 6,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
    },
    drawer: {
      height: '100%',
      paddingTop: 32,
      paddingBottom: 20,
      paddingHorizontal: 20,
      justifyContent: 'flex-start',
      borderTopRightRadius: 24,
      borderBottomRightRadius: 24,
      backdropFilter: Platform.OS === 'web' ? 'blur(16px)' : undefined,
    },
    drawerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    drawerHeaderTexts: {
      flex: 1,
      marginLeft: 12,
    },
    drawerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#fff',
    },
    drawerSubtitle: {
      fontSize: 13,
      fontWeight: '500',
      color: 'rgba(255,255,255,0.7)',
    },
    drawerLogo: {
      width: 48,
      height: 48,
      borderRadius: 12,
    },
    drawerMenu: {
      gap: 0,
      marginTop: 4,
    },
    drawerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    drawerItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    drawerItemLast: {
      borderBottomWidth: 0,
      paddingBottom: 10,
    },
    drawerLogoutButton: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 14,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: 'rgba(10,132,255,0.35)',
      backgroundColor: 'rgba(10,132,255,0.15)',
    },
    drawerLogoutText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#0A84FF',
    },
    drawerSwitch: {
      transform: [{ scale: Platform.OS === 'android' ? 0.9 : 1 }],
    },
    drawerItemText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    emergencyModal: {
      width: '90%',
      maxWidth: 360,
      borderRadius: 20,
      padding: 20,
      gap: 16,
    },
    emergencyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    emergencyTitle: {
      fontSize: 20,
      fontWeight: '700',
    },
    emergencySubtitle: {
      fontSize: 13,
      lineHeight: 18,
    },
    emergencyClose: {
      padding: 6,
    },
    emergencyList: {
      gap: 10,
    },
    emergencyItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderRadius: 14,
      backgroundColor: isDarkMode ? colors.surfaceAlt : '#F8FAFC',
    },
    emergencyItemLabel: {
      fontSize: 15,
      fontWeight: '600',
    },
    emergencyItemNumber: {
      fontSize: 13,
      marginTop: 2,
    },
    emergencyFooterBtn: {
      borderWidth: 1,
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: 'center',
    },
    emergencyFooterText: {
      fontSize: 14,
      fontWeight: '600',
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 20,
      gap: 12,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    modalSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    modalInput: {
      minHeight: 100,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      textAlignVertical: 'top',
      fontSize: 14,
      backgroundColor: colors.surface,
      color: colors.textPrimary,
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
      backgroundColor: colors.accent,
    },
    modalButtonText: {
      color: colors.accentContrast,
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
    },
    modalButtonSecondary: {
      backgroundColor: colors.surfaceAlt,
    },
    modalButtonSecondaryText: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '500',
    },
  });

import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, Switch, useColorScheme, Linking, ToastAndroid, Platform } from 'react-native';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Menu, Bell, MessageCircle, Search, MapPin } from 'lucide-react-native';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { getCollection } from '@/lib/supabase';
import { Service } from '@/types/database';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/config/api';
import { useRouter } from 'expo-router';
import { io, Socket } from 'socket.io-client';

export default function MechanicHomeScreen() {
  const router = useRouter();
  const { profile, updateProfile } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const colorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(colorScheme === 'dark');
  const [locationText, setLocationText] = useState<string>('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);
  const [mechanicDocId, setMechanicDocId] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(profile?.is_available || false);
  const socketRef = useRef<Socket | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [ratingAverage, setRatingAverage] = useState<number>(profile?.rating_average ?? 0);
  const [ratingCount, setRatingCount] = useState<number>(profile?.rating_count ?? 0);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
    // Ici, vous pouvez ajouter la logique pour sauvegarder la préférence de thème
  };

  const getAuthHeaders = useCallback(async () => {
    const token = await AsyncStorage.getItem('authToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }, []);

  const loadNearbyBreakdowns = async (lat: number, lng: number) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/breakdowns/nearby?lat=${lat}&lng=${lng}&radiusKm=20`, {
        method: 'GET',
        headers,
      });
      if (!res.ok) throw new Error('Failed to load nearby breakdowns');
      const data = await res.json();
      const mapped: NearbyBreakdown[] = (data.data || []).map((item: any) => ({
        id: item.id,
        clientName: item.client?.name || item.clientName || 'Client',
        clientPhoto: item.client?.photo || item.clientPhoto,
        clientPhone: item.client?.phone || item.clientPhone,
        clientUserId: item.client?.userId || item.clientUserId,
        description: item.description,
        latitude: item.latitude,
        longitude: item.longitude,
        distanceKm: item.distanceKm,
        estimatedDurationMin: item.estimatedDurationMin,
        reportedAt: item.reportedAt,
        status: item.status,
      }));
      setNearbyBreakdowns(mapped);
      if (!incomingBreakdown && mapped.length > 0) {
        setIncomingBreakdown(mapped[0]);
      }
    } catch (e) {
      setNearbyBreakdowns([]);
    }
  };

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.LONG);
    } else {
      Alert.alert('Nouvelle panne', message);
    }
  };

  const fetchUnreadNotifications = useCallback(async () => {
    try {
      const currentUserId = (profile as any)?.id || (profile as any)?._id;
      if (!currentUserId) {
        setUnreadNotifications(0);
        return;
      }
      const headers = await getAuthHeaders();
      const searchParams = new URLSearchParams({
        userId: String(currentUserId),
        read: 'false',
      });
      const res = await fetch(`${API_URL}/api/notifications?${searchParams.toString()}`, { headers });
      if (!res.ok) {
        setUnreadNotifications(0);
        return;
      }
      const payload = await res.json();
      const items = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : [];
      setUnreadNotifications(items.length);
    } catch {
      setUnreadNotifications(0);
    }
  }, [API_URL, getAuthHeaders, profile]);

  const fetchMechanicDocId = useCallback(async () => {
    if (mechanicDocId) {
      return mechanicDocId;
    }
    try {
      const currentUserId = (profile as any)?.id || (profile as any)?._id;
      if (!currentUserId) {
        return null;
      }
      const headers = await getAuthHeaders();
      const listRes = await fetch(`${API_URL}/api/mechanics`, { headers });
      if (!listRes.ok) return null;
      const mechanicsPayload = await listRes.json();
      const mechanicsArray = Array.isArray(mechanicsPayload)
        ? mechanicsPayload
        : Array.isArray(mechanicsPayload?.data)
          ? mechanicsPayload.data
          : [];

      const me = mechanicsArray.find((m: any) => {
        const userId = m?.user?._id || m?.user?.id || m?.user;
        return userId && String(userId) === String(currentUserId);
      });

      if (me && me._id) {
        const id = String(me._id);
        setMechanicDocId(id);
        return id;
      }
    } catch {
      return null;
    }
    return null;
  }, [API_URL, getAuthHeaders, mechanicDocId, profile]);

  const fetchMechanicRatingStats = useCallback(async () => {
    try {
      const docId = mechanicDocId || (await fetchMechanicDocId());
      if (!docId) return;
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/reviews/average/mechanic/${docId}`, { headers });
      if (!res.ok) return;
      const payload = await res.json();
      const avg = Number(payload?.avg ?? payload?.average ?? 0);
      const count = Number(payload?.count ?? 0);
      setRatingAverage(Number.isFinite(avg) ? avg : 0);
      setRatingCount(Number.isFinite(count) ? count : 0);
    } catch (error) {
      console.warn('Impossible de récupérer les statistiques d\'avis:', error);
    }
  }, [API_URL, fetchMechanicDocId, getAuthHeaders, mechanicDocId]);

  useEffect(() => {
    fetchMechanicDocId();
  }, [fetchMechanicDocId]);

  useEffect(() => {
    fetchMechanicRatingStats();
  }, [fetchMechanicRatingStats]);

  useEffect(() => {
    setRatingAverage(profile?.rating_average ?? 0);
    setRatingCount(profile?.rating_count ?? 0);
  }, [profile]);

  useEffect(() => {
    fetchUnreadNotifications();
    const interval = setInterval(fetchUnreadNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadNotifications]);

  const handleOpenNotifications = useCallback(async () => {
    try {
      const currentUserId = (profile as any)?.id || (profile as any)?._id;
      const headers = await getAuthHeaders();
      if (!currentUserId || !headers) {
        Alert.alert('Notifications', 'Aucune notification disponible.');
        return;
      }
      const searchParams = new URLSearchParams({
        userId: String(currentUserId),
        read: 'false',
      });
      const res = await fetch(`${API_URL}/api/notifications?${searchParams.toString()}`, { headers });
      if (res.ok) {
        const payload = await res.json();
        const items = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : [];

        await Promise.all(
          items
            .map((notif: any) => notif?._id || notif?.id)
            .filter(Boolean)
            .map((id: string) =>
              fetch(`${API_URL}/api/notifications/${id}/read`, {
                method: 'PATCH',
                headers,
              }),
            ),
        );
      }
      setUnreadNotifications(0);
      Alert.alert('Notifications', 'Toutes les notifications ont été marquées comme lues.');
    } catch (error) {
      console.error('Failed to mark notifications as read', error);
      Alert.alert('Notifications', "Impossible de mettre à jour les notifications.");
    }
  }, [API_URL, getAuthHeaders, profile]);

  const openMap = async () => {
    try {
      if (coords) {
        const url = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
        await Linking.openURL(url);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const url = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert('Localisation', "Impossible d'ouvrir la carte. Activez la localisation.");
    }
  };

  const saveMechanicLocation = async ({ latitude, longitude, address }: { latitude: number; longitude: number; address?: string }) => {
    try {
      const headers = await getAuthHeaders();
      const docId = await fetchMechanicDocId();
      if (!docId) return;

      await fetch(`${API_URL}/api/mechanics/${docId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ latitude, longitude, ...(address ? { address } : {}) }),
      });
    } catch {
      // silencieux
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
 
  const [pendingServices, setPendingServices] = useState<Service[]>([]);
  const [activeService, setActiveService] = useState<Service | null>(null);
  type NearbyBreakdown = {
    id: string;
    clientName: string;
    clientPhoto?: string;
    clientPhone?: string;
    clientUserId?: string;
    description: string;
    latitude: number;
    longitude: number;
    distanceKm: number;
    estimatedDurationMin: number;
    reportedAt?: string;
    status: string;
  };
  const [nearbyBreakdowns, setNearbyBreakdowns] = useState<NearbyBreakdown[]>([]);
  const [incomingBreakdown, setIncomingBreakdown] = useState<NearbyBreakdown | null>(null);
  const [breakdownActionLoading, setBreakdownActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationText('Localisation désactivée');
          setLocationGranted(false);
          return;
        }
        setLocationGranted(true);
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          setLocationText('Services de localisation inactifs. Vérifiez que le GPS est allumé.');
          return;
        }
        let pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!pos || !pos.coords) {
          const last = await Location.getLastKnownPositionAsync();
          if (last) pos = last as any;
        }
        if (pos && pos.coords) {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          // Afficher d'abord les coordonnées pour éviter le vide
          const baseLabel = `${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}`;
          setLocationText(baseLabel);
          // Reverse geocode non bloquant
          try {
            const places = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
            if (places && places.length > 0) {
              const p = places[0];
              const city = p.city || p.subregion || p.region || '';
              const country = p.country || '';
              const name = p.name || p.street || '';
              const composed = [name, city, country].filter(Boolean).join(', ');
              if (composed) setLocationText(composed);
            }
          } catch {}
          await saveMechanicLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, address: undefined });
          await loadNearbyBreakdowns(pos.coords.latitude, pos.coords.longitude);
        } else {
          setLocationText('Localisation indisponible');
        }
      } catch {
        setLocationText('Localisation indisponible');
      }
    })();
  }, []);

  const refreshLocation = async (): Promise<{ lat: number; lng: number } | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationText('Localisation désactivée');
        setLocationGranted(false);
        return null;
      }
      setLocationGranted(true);
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setLocationText('Services de localisation inactifs. Activez le GPS.');
        return null;
      }
      let pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (!pos || !pos.coords) {
        const last = await Location.getLastKnownPositionAsync();
        if (last) pos = last as any;
      }
      if (pos && pos.coords) {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        const baseLabel = `${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}`;
        setLocationText(baseLabel);
        try {
          const places = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
          if (places && places.length > 0) {
            const p = places[0];
            const city = p.city || p.subregion || p.region || '';
            const country = p.country || '';
            const name = p.name || p.street || '';
            const composed = [name, city, country].filter(Boolean).join(', ');
            if (composed) setLocationText(composed);
          }
        } catch {}
        await saveMechanicLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, address: undefined });
        await loadNearbyBreakdowns(pos.coords.latitude, pos.coords.longitude);
        return { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } else {
        setLocationText('Localisation indisponible');
      }
    } catch {
      setLocationText('Localisation indisponible');
    }
    return null;
  };

  const ensureLocationEnabled = async () => {
    const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
    if (status === 'granted') {
      await refreshLocation();
      return;
    }
    const req = await Location.requestForegroundPermissionsAsync();
    if (req.status === 'granted') {
      setLocationGranted(true);
      await refreshLocation();
      return;
    }
    // Permission refusée définitivement: ouvrir les réglages
    setLocationGranted(false);
    try {
      await Linking.openSettings();
    } catch {}
  };

  const connectSocket = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;
      const baseUrl = API_URL.replace('/api', '');
      const socket = io(baseUrl, {
        auth: { token },
        transports: ['websocket'],
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('Socket connecté pour les pannes');
      });

      socket.on('breakdown_nearby', async (payload: any) => {
        try {
          const breakdown = payload?.breakdown;
          if (!breakdown) return;
          const message = breakdown.description || 'Nouvelle panne à proximité';
          showToast(message);
          const mapped: NearbyBreakdown = {
            id: breakdown._id || breakdown.id,
            clientName: [
              breakdown.client?.user?.firstName,
              breakdown.client?.user?.lastName,
            ].filter(Boolean).join(' ') || message,
            clientPhoto: breakdown.client?.user?.profilePhoto,
            clientPhone: breakdown.client?.user?.phoneNumber,
            clientUserId: breakdown.client?.user?._id || breakdown.client?.user?.id,
            description: breakdown.description,
            latitude: breakdown.latitude ?? 0,
            longitude: breakdown.longitude ?? 0,
            distanceKm: payload?.distanceKm ?? 0,
            estimatedDurationMin: payload?.estimatedDurationMin ?? 0,
            reportedAt: breakdown.reportedAt,
            status: breakdown.status,
          };
          setIncomingBreakdown(mapped);
          await refreshLocation();
        } catch (err) {
          console.warn('Erreur lors du rafraîchissement des pannes proches:', err);
        }
      });

      socket.on('breakdown_created', async (payload: any) => {
        try {
          const breakdown = payload;
          if (!breakdown) return;
          const mapped: NearbyBreakdown = {
            id: breakdown._id || breakdown.id,
            clientName: [
              breakdown.client?.user?.firstName,
              breakdown.client?.user?.lastName,
            ].filter(Boolean).join(' ') || 'Nouvelle panne',
            clientPhoto: breakdown.client?.user?.profilePhoto,
            clientPhone: breakdown.client?.user?.phoneNumber,
            clientUserId: breakdown.client?.user?._id || breakdown.client?.user?.id,
            description: breakdown.description,
            latitude: breakdown.latitude ?? 0,
            longitude: breakdown.longitude ?? 0,
            distanceKm: 0,
            estimatedDurationMin: 0,
            reportedAt: breakdown.reportedAt,
            status: breakdown.status,
          };
          setIncomingBreakdown(mapped);
          await refreshLocation();
        } catch (err) {
          console.warn('Erreur lors du traitement breakdown_created:', err);
        }
      });

      socket.on('review_received', (payload: any) => {
        try {
          const stats = payload?.stats || {};
          const avg = Number(stats.average ?? stats.avg ?? ratingAverage ?? 0);
          const count = Number(stats.count ?? ratingCount ?? 0);
          setRatingAverage(Number.isFinite(avg) ? avg : 0);
          setRatingCount(Number.isFinite(count) ? count : 0);
          fetchUnreadNotifications();
          showToast('Vous avez reçu un nouvel avis.');
        } catch (error) {
          console.warn('Erreur lors du traitement de review_received:', error);
        }
      });

      socket.on('disconnect', () => {
        console.log('Socket pannes déconnecté');
      });
    } catch (error) {
      console.warn('Impossible de connecter le socket pannes:', error);
    }
  }, [API_URL, fetchUnreadNotifications, ratingAverage, ratingCount, refreshLocation]);

  const handleAcceptBreakdown = useCallback(async (breakdown: NearbyBreakdown) => {
    if (!breakdown?.id) return;
    try {
      setBreakdownActionLoading(breakdown.id);
      const docId = await fetchMechanicDocId();
      if (!docId) {
        Alert.alert('Profil mécanicien introuvable', 'Impossible de récupérer votre fiche mécanicien.');
        return;
      }
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/breakdowns/${breakdown.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          mechanic: docId,
          status: 'in_progress',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Erreur lors de l\'acceptation.' }));
        throw new Error(err.message || 'Erreur lors de l\'acceptation.');
      }
      let finalCoords = coords ? { ...coords } : null;
      if (!finalCoords) {
        finalCoords = await refreshLocation();
      }

      setIncomingBreakdown(null);
      if (finalCoords) {
        await loadNearbyBreakdowns(finalCoords.lat, finalCoords.lng);
      }

      const params = {
        breakdownId: breakdown.id,
        clientName: breakdown.clientName,
        clientLat: String(breakdown.latitude ?? ''),
        clientLng: String(breakdown.longitude ?? ''),
        clientPhone: breakdown.clientPhone ?? '',
        description: breakdown.description ?? '',
        distanceKm: String(breakdown.distanceKm ?? ''),
        etaMin: String(breakdown.estimatedDurationMin ?? ''),
        mechanicLat: finalCoords ? String(finalCoords.lat) : '',
        mechanicLng: finalCoords ? String(finalCoords.lng) : '',
      };

      router.push({ pathname: '/(mechanic)/navigation', params } as never);
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible d\'accepter la panne.');
    } finally {
      setBreakdownActionLoading(null);
    }
  }, [API_URL, coords, fetchMechanicDocId, getAuthHeaders, loadNearbyBreakdowns]);

  const handleDeclineBreakdown = useCallback((breakdown: NearbyBreakdown) => {
    if (incomingBreakdown?.id === breakdown.id) {
      setIncomingBreakdown(null);
    }
  }, [incomingBreakdown]);

  useEffect(() => {
    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [connectSocket]);

  const loadServices = async () => {
    try {
      const servicesCollection = await getCollection('services');
      
      const pending = await servicesCollection
        .find({ status: 'pending' })
        .sort({ created_at: -1 })
        .limit(5)
        .toArray();

      const active = await servicesCollection.findOne({
        mechanic_id: profile?.id,
        status: { $in: ['accepted', 'in_progress'] }
      });

      setPendingServices(pending as Service[]);
      setActiveService(active as Service | null);
    } catch (error) {
      console.error('Error loading services:', error);
    }
  };

  const toggleAvailability = async (value: boolean) => {
    try {
      await updateProfile({ is_available: value });
      setIsAvailable(value);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de mettre à jour le statut');
    }
  };

  const handleAcceptService = async (serviceId: string) => {
    try {
      const servicesCollection = await getCollection('services');
      await servicesCollection.updateOne(
        { _id: serviceId },
        {
          $set: {
            mechanic_id: profile?.id,
            status: 'accepted',
            accepted_at: new Date().toISOString(),
          }
        }
      );

      Alert.alert('Succès', 'Service accepté');
      loadServices();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'accepter le service');
    }
  };

  return (
    <View style={styles.container}>
      <Sidebar 
        isVisible={isSidebarOpen} 
        onClose={toggleSidebar} 
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
      />
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={toggleSidebar}
        >
          <Menu color="white" size={24} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.logo}>TerangaAuto</Text>
          <Text style={styles.subtitle} onPress={openMap}>
            {locationText || 'Mécanicien'}
          </Text>
        </View>

      {locationGranted === false && (
        <View style={styles.locationPrompt}>
          <Text style={styles.locationPromptText}>Activez votre localisation pour afficher votre adresse</Text>
          <TouchableOpacity style={styles.locationPromptBtn} onPress={ensureLocationEnabled}>
            <Text style={styles.locationPromptBtnText}>Activer la localisation</Text>
          </TouchableOpacity>
        </View>
      )}
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerButton} onPress={handleOpenNotifications}>
            <Bell color="white" size={24} />
            {unreadNotifications > 0 ? (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unreadNotifications > 9 ? '9+' : unreadNotifications}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
      </View>

      {/* Bannière publicitaire */}
      <View style={styles.adBanner}>
        <Image 
          source={require('@/assets/images/Futuristic Teranga Auto Logo.png')} 
          style={styles.adImage}
          resizeMode="contain"
        />
        <Text style={styles.adText}>20% de réduction sur la révision complète</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View>
              <Text style={styles.statusTitle}>Statut de disponibilité</Text>
              <Text style={styles.statusSubtitle}>
                {isAvailable ? 'Vous êtes disponible' : 'Vous êtes indisponible'}
              </Text>
            </View>
            <Switch
              value={isAvailable}
              onValueChange={toggleAvailability}
              trackColor={{ false: '#E0E0E0', true: '#34C759' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{ratingCount || 0}</Text>
            <Text style={styles.statLabel}>Avis reçus</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>⭐ {ratingAverage.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Note moyenne</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{pendingServices.length}</Text>
            <Text style={styles.statLabel}>En attente</Text>
          </View>
        </View>

        {activeService && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mission en cours</Text>
            <View style={styles.serviceCard}>
              <View style={styles.serviceHeader}>
                <View style={styles.serviceBadge}>
                  <Text style={styles.serviceBadgeText}>
                    {activeService.status === 'accepted' ? 'Accepté' : 'En cours'}
                  </Text>
                </View>
                <Text style={styles.serviceType}>{activeService.service_type}</Text>
              </View>
              <Text style={styles.serviceDescription}>
                {activeService.description}
              </Text>
              <View style={styles.serviceLocation}>
                <MapPin color="#666" size={16} />
                <Text style={styles.serviceLocationText}>
                  {activeService.location_address}
                </Text>
              </View>
              <View style={styles.serviceActions}>
                <TouchableOpacity style={styles.navigateButton}>
                  <Text style={styles.navigateButtonText}>
                    Démarrer la navigation
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Demandes de service</Text>
          {incomingBreakdown ? (
            <View style={[styles.serviceCard, styles.incomingCard]}>
              <View style={styles.incomingHeader}>
                <Text style={styles.incomingTitle}>Nouvelle demande</Text>
                <Text style={styles.incomingDistance}>{incomingBreakdown.distanceKm?.toFixed(1)} km</Text>
              </View>
              <View style={styles.incomingClientRow}>
                <View style={styles.incomingAvatar}>
                  {incomingBreakdown.clientPhoto ? (
                    <Image source={{ uri: incomingBreakdown.clientPhoto }} style={styles.incomingAvatarImage} />
                  ) : (
                    <Text style={styles.incomingAvatarInitials}>
                      {incomingBreakdown.clientName?.slice(0, 2).toUpperCase() || 'CL'}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.incomingClientName}>{incomingBreakdown.clientName}</Text>
                  {incomingBreakdown.clientPhone ? (
                    <Text style={styles.incomingClientPhone}>{incomingBreakdown.clientPhone}</Text>
                  ) : null}
                </View>
              </View>
              <Text style={styles.incomingDescription}>{incomingBreakdown.description}</Text>
              <View style={styles.incomingInfoRow}>
                <MapPin color="#666" size={16} />
                <Text style={styles.incomingInfoText}>
                  {incomingBreakdown.latitude.toFixed(4)}, {incomingBreakdown.longitude.toFixed(4)} • env.{' '}
                  {incomingBreakdown.estimatedDurationMin} min
                </Text>
              </View>
              <View style={styles.incomingActions}>
                <TouchableOpacity
                  style={[styles.declineButton, { flex: 1 }]}
                  onPress={() => handleDeclineBreakdown(incomingBreakdown)}
                  disabled={breakdownActionLoading === incomingBreakdown.id}
                >
                  <Text style={styles.declineButtonText}>Refuser</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.acceptButton, { flex: 1 }]}
                  onPress={() => handleAcceptBreakdown(incomingBreakdown)}
                  disabled={breakdownActionLoading === incomingBreakdown.id}
                >
                  <Text style={styles.acceptButtonText}>
                    {breakdownActionLoading === incomingBreakdown.id ? '...' : 'Accepter'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
          {nearbyBreakdowns.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Aucune demande à proximité</Text>
            </View>
          ) : (
            nearbyBreakdowns.map((b) => (
              <View key={b.id} style={styles.serviceCard}>
                <View style={styles.serviceHeader}>
                  <Text style={styles.serviceType}>{b.description || 'Panne'}</Text>
                  <Text style={styles.serviceDistance}>{b.distanceKm.toFixed(1)} km • {b.estimatedDurationMin} min</Text>
                </View>
                <Text style={styles.serviceDescription}>Client: {b.clientName}</Text>
                <View style={styles.serviceLocation}>
                  <MapPin color="#666" size={16} />
                  <Text style={styles.serviceLocationText}>
                    {b.latitude.toFixed(4)}, {b.longitude.toFixed(4)}
                  </Text>
                </View>
                <View style={styles.serviceActions}>
                  <TouchableOpacity style={styles.acceptButton}>
                    <Text style={styles.acceptButtonText}>Accepter</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.declineButton}>
                    <Text style={styles.declineButtonText}>Refuser</Text>
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
        onPress={() => router.push('/(mechanic)/(tabs)/messages' as any)}
        activeOpacity={0.8}
      >
        <MessageCircle size={28} color="#22C55E" />
      </TouchableOpacity>
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
    backgroundColor: '#0A1F44',
    borderBottomWidth: 1,
    borderBottomColor: '#0A1F44',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0A1F44',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    marginLeft: 12,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  headerCenter: {
    alignItems: 'center',
  },
  logo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  content: {
    flex: 1,
  },
  locationPrompt: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
  },
  locationPromptText: {
    color: '#7C2D12',
    fontSize: 12,
    marginBottom: 8,
  },
  locationPromptBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#0A1F44',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  locationPromptBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  adBanner: {
    backgroundColor: '#0A1F44',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    height: 180,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  adText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
    textShadowColor: 'rgba(0, 240, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  adImage: {
    width: 120,
    height: 80,
    marginBottom: 12,
  },
  statusCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  statsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  serviceCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  serviceBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  incomingCard: {
    borderColor: '#0A1F44',
    borderWidth: 1,
    backgroundColor: '#F8FAFF',
  },
  incomingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  incomingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0A1F44',
  },
  incomingDistance: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  incomingClientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  incomingAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  incomingAvatarImage: {
    width: '100%',
    height: '100%',
  },
  incomingAvatarInitials: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0A1F44',
  },
  incomingClientName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  incomingClientPhone: {
    fontSize: 13,
    color: '#4B5563',
  },
  incomingDescription: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 12,
  },
  incomingInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  incomingInfoText: {
    fontSize: 13,
    color: '#1F2937',
  },
  incomingActions: {
    flexDirection: 'row',
    gap: 12,
  },
  serviceType: {
    fontSize: 16,
    fontWeight: '600',
  },
  serviceDistance: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  serviceDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  serviceLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  serviceLocationText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  serviceActions: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#34C759',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  declineButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  navigateButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  navigateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
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
});

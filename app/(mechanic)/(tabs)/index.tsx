import { View, Text, TouchableOpacity, TouchableWithoutFeedback, ScrollView, Image, Alert, Switch, Linking, ToastAndroid, Platform, Modal, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Menu, Bell, MessageCircle, Search, MapPin, BarChart3, Trash2 } from 'lucide-react-native';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { getCollection } from '@/lib/supabase';
import { Service } from '@/types/database';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/config/api';
import { useRouter, useFocusEffect } from 'expo-router';
import { io, Socket } from 'socket.io-client';
import { Swipeable, RectButton, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useClientTheme } from '@/contexts/ClientThemeContext';
import type { ClientThemeColors } from '@/contexts/ClientThemeContext';

const parseJSONSafe = async (response: any) => {
  try {
    if (!response) return null;
    if (response.status === 204 || response.status === 304) return null;
    const text = await response.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
};

export default function MechanicHomeScreen() {
  const router = useRouter();
  const { profile, updateProfile } = useAuth();
  const { colors, isDarkMode } = useClientTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [locationText, setLocationText] = useState<string>('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);
  const [mechanicDocId, setMechanicDocId] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(profile?.is_available || false);
  const socketRef = useRef<Socket | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [unreadMessages, setUnreadMessages] = useState<number>(0);
  const [ratingAverage, setRatingAverage] = useState<number>(profile?.rating_average ?? 0);
  const [ratingCount, setRatingCount] = useState<number>(profile?.rating_count ?? 0);
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [pendingNotifications, setPendingNotifications] = useState<any[]>([]);
  const [markingNotifications, setMarkingNotifications] = useState(false);
  const [removingNotificationId, setRemovingNotificationId] = useState<string | null>(null);
  const [complaintsDrawerVisible, setComplaintsDrawerVisible] = useState(false);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);

  const getAuthHeaders = useCallback(async () => {
    const token = await AsyncStorage.getItem('authToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }, []);

  const resolvePhotoUrl = (raw?: unknown) => {
    if (!raw) return undefined;
    const url = typeof raw === 'string'
      ? raw
      : typeof raw === 'object' && raw !== null
        ? (raw as any).url || (raw as any).path || (raw as any).uri || undefined
        : undefined;
    if (!url || typeof url !== 'string') return undefined;
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith('data:')) return url;
    const base = API_URL.replace(/\/api$/, '');
    return `${base}${url.startsWith('/') ? url : `/${url}`}`;
  };

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
        clientPhoto: resolvePhotoUrl(
          item.client?.user?.profilePhoto ??
          item.client?.photo ??
          item.clientPhoto ??
          item.client?.profilePhoto
        ),
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
      setIncomingBreakdown((prev) => {
        if (!prev) {
          return mapped[0] ?? null;
        }
        const updated = mapped.find((item) => item.id === prev.id);
        return updated ?? prev;
      });
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

  const showInfoToast = (message: string, title: string = 'Informations') => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert(title, message);
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
        type: 'complaint',
      });
      const res = await fetch(`${API_URL}/api/notifications?${searchParams.toString()}`, { headers });
      if (!res.ok && res.status !== 304) {
        setUnreadNotifications(0);
        return;
      }
      const payload = await parseJSONSafe(res);
      if (Array.isArray(payload)) {
        setUnreadNotifications(payload.length);
        return;
      }
      const unreadFromPayload = Number(payload?.pagination?.unreadCount ?? payload?.unreadCount ?? 0);
      if (Number.isFinite(unreadFromPayload)) {
        setUnreadNotifications(unreadFromPayload);
        return;
      }
      const items = Array.isArray(payload?.data) ? payload.data : [];
      setUnreadNotifications(items.length);
    } catch {
      setUnreadNotifications(0);
    }
  }, [API_URL, getAuthHeaders, profile]);

  const refreshUnreadNotificationsCount = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/notifications/unread/count`, { headers });
      if (!res.ok && res.status !== 304) {
        return;
      }
      const payload = await parseJSONSafe(res);
      const count = Number(payload?.count ?? payload?.data?.count ?? 0);
      setUnreadNotifications(Number.isFinite(count) ? count : 0);
    } catch {
      // silent
    }
  }, [API_URL, getAuthHeaders]);

  const handleDeleteNotification = useCallback(
    async (notificationId?: string) => {
      if (!notificationId) return;
      try {
        setRemovingNotificationId(notificationId);
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_URL}/api/notifications/${notificationId}`, {
          method: 'DELETE',
          headers,
        });
        if (!res.ok) {
          const payload = await parseJSONSafe(res);
          const message = payload?.message || 'Suppression impossible pour le moment.';
          Alert.alert('Notifications', message);
          return;
        }
        setPendingNotifications((prev) => prev.filter((item) => String(item?._id || item?.id) !== String(notificationId)));
        await refreshUnreadNotificationsCount();
      } catch (error) {
        console.error('Unable to delete notification', error);
        Alert.alert('Notifications', "Impossible de supprimer la notification.");
      } finally {
        setRemovingNotificationId(null);
      }
    },
    [API_URL, getAuthHeaders, refreshUnreadNotificationsCount],
  );

  const fetchUnreadMessages = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/messages/unread-count`, { headers });
      if (!res.ok && res.status !== 304) {
        setUnreadMessages(0);
        return;
      }
      const payload = await parseJSONSafe(res);
      const total = Number(payload?.data?.totalUnread ?? payload?.totalUnread ?? 0);
      setUnreadMessages(Number.isFinite(total) ? total : 0);
    } catch {
      setUnreadMessages(0);
    }
  }, [API_URL, getAuthHeaders]);

  const fetchComplaints = useCallback(async () => {
    try {
      const currentUserId = (profile as any)?.id || (profile as any)?._id;
      if (!currentUserId) {
        setComplaints([]);
        return;
      }
      setLoadingComplaints(true);
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${API_URL}/api/complaints?${new URLSearchParams({
          sort: '-createdAt',
          limit: '50',
        }).toString()}`,
        { headers },
      );
      if (!res.ok && res.status !== 304) {
        setComplaints([]);
        return;
      }
      const payload = await parseJSONSafe(res);
      const complaintsArray = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : [];
      setComplaints(complaintsArray);
    } catch (error) {
      console.error('Unable to fetch complaints', error);
      setComplaints([]);
    } finally {
      setLoadingComplaints(false);
    }
  }, [API_URL, getAuthHeaders, profile]);

  const openComplaintsDrawer = useCallback(() => {
    setComplaintsDrawerVisible(false);
  }, []);

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

  useEffect(() => {
    fetchUnreadMessages();
    const interval = setInterval(fetchUnreadMessages, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadMessages]);

  useFocusEffect(
    useCallback(() => {
      fetchUnreadMessages();
    }, [fetchUnreadMessages])
  );

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
        type: 'complaint',
      });
      const res = await fetch(`${API_URL}/api/notifications?${searchParams.toString()}`, { headers });
      if (res.ok || res.status === 304) {
        const payload = await parseJSONSafe(res);
        const items = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : [];
        if (items.length === 0) {
          showInfoToast('Aucune nouvelle notification.', 'Notifications');
          openComplaintsDrawer();
          return;
        }

        setPendingNotifications(items);
        setNotificationsModalVisible(true);
      }
    } catch (error) {
      console.error('Failed to mark notifications as read', error);
      showInfoToast("Impossible de mettre à jour les notifications.", 'Notifications');
    }
  }, [API_URL, getAuthHeaders, openComplaintsDrawer, profile, showInfoToast]);

  const handleConfirmNotifications = useCallback(async () => {
    if (markingNotifications) return;
    try {
      setMarkingNotifications(true);
      const headers = await getAuthHeaders();
      if (!headers) {
        setMarkingNotifications(false);
        return;
      }
      const ids = pendingNotifications
        .map((notif) => notif?._id || notif?.id)
        .filter(Boolean) as string[];

      if (ids.length === 0) {
        setNotificationsModalVisible(false);
        openComplaintsDrawer();
        return;
      }

      await Promise.all(
        ids.map((id) =>
          fetch(`${API_URL}/api/notifications/${id}/read`, {
            method: 'PATCH',
            headers,
          }),
        ),
      );

      await refreshUnreadNotificationsCount();
      setPendingNotifications([]);
      setNotificationsModalVisible(false);
      showInfoToast('Notifications marquées comme lues.', 'Notifications');
      fetchUnreadNotifications();
      openComplaintsDrawer();
    } catch (error) {
      console.error('Failed to confirm notifications', error);
      showInfoToast("Impossible de marquer les notifications comme lues.", 'Notifications');
    } finally {
      setMarkingNotifications(false);
    }
  }, [API_URL, fetchUnreadNotifications, getAuthHeaders, markingNotifications, openComplaintsDrawer, pendingNotifications, refreshUnreadNotificationsCount, showInfoToast]);

  const handleDismissNotifications = useCallback(() => {
    setNotificationsModalVisible(false);
  }, []);

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
  const [completedServicesCount, setCompletedServicesCount] = useState<number>(profile?.missions_completed ?? 0);
  const [navigatingToActiveService, setNavigatingToActiveService] = useState(false);
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

  const loadServices = useCallback(async () => {
    try {
      if (!profile?.id) {
        setPendingServices([]);
        setActiveService(null);
        setCompletedServicesCount(0);
        return;
      }
      const servicesCollection = await getCollection('services');

      const pending = await servicesCollection
        .find({ status: 'pending' })
        .sort({ created_at: -1 })
        .limit(5)
        .toArray();

      const activeCursor = servicesCollection
        .find({ mechanic_id: profile?.id, status: { $in: ['accepted', 'in_progress'] } })
        .sort({ updated_at: -1, started_at: -1, created_at: -1 })
        .limit(1);
      const activeList = await activeCursor.toArray();
      const active = activeList[0] ?? null;

      const completedCount = await servicesCollection.countDocuments({
        mechanic_id: profile.id,
        status: 'completed',
      });

      setPendingServices(pending as Service[]);
      const normalizedActive = (active as Service | null);
      if (normalizedActive && !['accepted', 'in_progress'].includes(normalizedActive.status)) {
        setActiveService(null);
      } else {
        setActiveService(normalizedActive);
      }
      setCompletedServicesCount(completedCount);
    } catch (error) {
      console.error('Error loading services:', error);
    }
  }, [profile?.id]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  useEffect(() => {
    (async () => {
      const applyPosition = async (latitude: number, longitude: number) => {
        setCoords({ lat: latitude, lng: longitude });
        const baseLabel = `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`;
        setLocationText(baseLabel);
        try {
          const places = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (places && places.length > 0) {
            const p = places[0];
            const city = p.city || p.subregion || p.region || '';
            const country = p.country || '';
            const name = p.name || p.street || '';
            const composed = [name, city, country].filter(Boolean).join(', ');
            if (composed) setLocationText(composed);
          }
        } catch {
          // Ignorer les erreurs de géocodage inversé
        }
        await saveMechanicLocation({ latitude, longitude, address: undefined });
        await loadNearbyBreakdowns(latitude, longitude);
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
          setLocationGranted(false);
          return;
        }
        setLocationGranted(true);

        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          const usedLast = await fallbackToLastKnown();
          if (!usedLast) {
            setLocationText('Vérifiez que le GPS est allumé.');
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

  const refreshLocation = async (): Promise<{ lat: number; lng: number } | null> => {
    const applyPosition = async (latitude: number, longitude: number) => {
      setCoords({ lat: latitude, lng: longitude });
      const baseLabel = `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`;
      setLocationText(baseLabel);
      try {
        const places = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (places && places.length > 0) {
          const p = places[0];
          const city = p.city || p.subregion || p.region || '';
          const country = p.country || '';
          const name = p.name || p.street || '';
          const composed = [name, city, country].filter(Boolean).join(', ');
          if (composed) setLocationText(composed);
        }
      } catch {
        // Ignorer les erreurs de géocodage inversé
      }
      await saveMechanicLocation({ latitude, longitude, address: undefined });
      await loadNearbyBreakdowns(latitude, longitude);
      return { lat: latitude, lng: longitude };
    };

    const fallbackToLastKnown = async () => {
      try {
        const last = await Location.getLastKnownPositionAsync();
        if (last?.coords) {
          return await applyPosition(last.coords.latitude, last.coords.longitude);
        }
      } catch {
        // Ignorer les erreurs de récupération de la dernière position connue
      }
      return null;
    };

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
        const last = await fallbackToLastKnown();
        if (!last) {
          setLocationText('Services de localisation inactifs. Activez le GPS.');
        }
        return last;
      }

      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (pos?.coords) {
        return await applyPosition(pos.coords.latitude, pos.coords.longitude);
      }

      const last = await fallbackToLastKnown();
      if (!last) {
        setLocationText('Localisation indisponible');
      }
      return last;
    } catch {
      const last = await fallbackToLastKnown();
      if (!last) {
        setLocationText('Localisation indisponible');
      }
      return last;
    }
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

      socket.on('breakdown_completed', async (payload: any) => {
        try {
          const breakdown = payload?.breakdown;
          if (!breakdown) return;
          const completedId = String(breakdown._id || breakdown.id || '');
          setActiveService((prev) => {
            if (!prev) return prev;
            const prevId = String((prev as any).id || (prev as any)._id || '');
            if (completedId && prevId && completedId === prevId) {
              return null;
            }
            return prev;
          });
          showInfoToast('Mission terminée', 'Le client a confirmé la fin de la mission.');
          await loadServices();
        } catch (error) {
          console.warn('Erreur lors du traitement breakdown_completed:', error);
        }
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
            clientPhoto: resolvePhotoUrl(
              breakdown.client?.user?.profilePhoto ??
              breakdown.client?.photo ??
              breakdown.client?.profilePhoto
            ),
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
            clientPhoto: resolvePhotoUrl(
              breakdown.client?.user?.profilePhoto ||
              breakdown.client?.photo ||
              breakdown.client?.profilePhoto
            ),
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
  }, [API_URL, fetchUnreadNotifications, loadServices, ratingAverage, ratingCount, refreshLocation, showInfoToast]);

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
      await loadServices();
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
  }, [API_URL, coords, fetchMechanicDocId, getAuthHeaders, loadNearbyBreakdowns, loadServices, refreshLocation, router]);

  const handleDeclineBreakdown = useCallback((breakdown: NearbyBreakdown) => {
    if (incomingBreakdown?.id === breakdown.id) {
      setIncomingBreakdown(null);
    }
  }, [incomingBreakdown]);

  const handleNavigateToActiveService = useCallback(async () => {
    if (!activeService || !['accepted', 'in_progress'].includes(activeService.status)) return;

    const parseNumber = (value: any): number | null => {
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
      }
      return null;
    };

    try {
      setNavigatingToActiveService(true);

      const targetLat =
        parseNumber((activeService as any).location_lat ?? (activeService as any).latitude ?? (activeService as any).client_lat);
      const targetLng =
        parseNumber((activeService as any).location_lng ?? (activeService as any).longitude ?? (activeService as any).client_lng);

      if (targetLat == null || targetLng == null) {
        Alert.alert('Navigation', 'Coordonnées client indisponibles pour cette mission.');
        return;
      }

      let mechanicPosition = coords;
      if (!mechanicPosition) {
        const refreshed = await refreshLocation();
        if (refreshed) mechanicPosition = refreshed;
      }
      if (!mechanicPosition) {
        Alert.alert('Navigation', 'Impossible de récupérer votre position actuelle.');
        return;
      }

      let clientName: string | undefined = (activeService as any).client_name || (activeService as any).clientName;
      let clientPhone: string | undefined = (activeService as any).client_phone || (activeService as any).clientPhone;

      if ((!clientName || !clientPhone) && activeService.client_id) {
        try {
          const profilesCollection = await getCollection('profiles');
          const clientProfile = await profilesCollection.findOne({ _id: activeService.client_id });
          if (clientProfile) {
            const firstName = clientProfile.first_name || clientProfile.firstName;
            const lastName = clientProfile.last_name || clientProfile.lastName;
            const composedName = [firstName, lastName].filter(Boolean).join(' ');
            if (!clientName && composedName) clientName = composedName;
            if (!clientName && clientProfile.name) clientName = clientProfile.name;
            const phone = clientProfile.phone || clientProfile.phoneNumber || clientProfile.phone_number;
            if (!clientPhone && phone) clientPhone = phone;
          }
        } catch (error) {
          console.warn('Unable to fetch client profile for active service:', error);
        }
      }

      if (!clientName) clientName = 'Client';

      const distanceValue =
        (activeService as any).distance_km ??
        (activeService as any).distanceKm ??
        (activeService as any).distance ??
        null;
      const etaValue =
        (activeService as any).estimated_time ??
        (activeService as any).estimated_duration ??
        (activeService as any).eta_min ??
        null;

      const serviceId = activeService.id || (activeService as any)._id || '';

      const destination = `${targetLat},${targetLng}`;
      const origin = mechanicPosition ? `${mechanicPosition.lat},${mechanicPosition.lng}` : '';
      const navUrl = Platform.select({
        ios: `http://maps.apple.com/?daddr=${destination}${origin ? `&saddr=${origin}` : ''}`,
        android: `https://www.google.com/maps/dir/?api=1&destination=${destination}${origin ? `&origin=${origin}` : ''}`,
        default: `https://www.google.com/maps/dir/?api=1&destination=${destination}${origin ? `&origin=${origin}` : ''}`,
      });

      if (navUrl) {
        try {
          await Linking.openURL(navUrl);
          return;
        } catch (error) {
          console.warn('Unable to open external navigation, falling back to in-app screen.', error);
        }
      }

      router.push({
        pathname: '/(mechanic)/navigation',
        params: {
          breakdownId: serviceId ? String(serviceId) : '',
          clientName,
          clientPhone: clientPhone ? String(clientPhone) : '',
          clientLat: String(targetLat),
          clientLng: String(targetLng),
          description: activeService.description || activeService.service_type || 'Mission client',
          distanceKm: distanceValue != null ? String(distanceValue) : '',
          etaMin: etaValue != null ? String(etaValue) : '',
          mechanicLat: mechanicPosition ? String(mechanicPosition.lat) : '',
          mechanicLng: mechanicPosition ? String(mechanicPosition.lng) : '',
        },
      } as never);
    } catch (error: any) {
      Alert.alert('Navigation', error?.message || 'Impossible d\'ouvrir la navigation.');
    } finally {
      setNavigatingToActiveService(false);
    }
  }, [activeService, coords, refreshLocation, router]);

  useEffect(() => {
    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [connectSocket]);

  const toggleAvailability = async (value: boolean) => {
    try {
      const docId = await fetchMechanicDocId();
      if (!docId) {
        Alert.alert('Disponibilité', 'Impossible de récupérer votre fiche mécanicien.');
        return;
      }

      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/mechanics/${docId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ available: value }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: 'Échec mise à jour disponibilité.' }));
        throw new Error(err.message || 'Échec mise à jour disponibilité.');
      }

      setIsAvailable(value);
    } catch (error: any) {
      Alert.alert('Erreur', error?.message || 'Impossible de mettre à jour le statut');
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
          <TouchableOpacity style={styles.locationPill} onPress={openMap} activeOpacity={0.85}>
            <MapPin size={14} color="#38BDF8" />
            <Text style={styles.locationPillText} numberOfLines={1}>
              {locationText || 'Position en cours'}
            </Text>
          </TouchableOpacity>
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

      <ScrollView style={styles.content}>
        {/* Carte de bienvenue */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeText}>
            Bonjour, {profile?.first_name} !
          </Text>
          <Text style={styles.welcomeSubtext}>
            Gérez vos missions et votre disponibilité
          </Text>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.statusInfo}>
              <View style={styles.statusIconWrapper}>
                <View style={styles.statusIconGlow} />
                <MapPin color="#0A1F44" size={18} />
              </View>
              <View>
                <Text style={styles.statusTitle}>Statut de disponibilité</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusSubtitle}>
                    {isAvailable ? 'Vous êtes disponible' : 'Vous êtes indisponible'}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.statusSwitchWrapper}>
              <Text style={styles.statusSwitchLabel}>{isAvailable ? 'ON' : 'OFF'}</Text>
              <Switch
                value={isAvailable}
                onValueChange={toggleAvailability}
                trackColor={{ false: '#D1D5DB', true: '#34C759' }}
                thumbColor="#fff"
              />
            </View>
          </View>
          <Text style={styles.statusHint}>
            Activez pour recevoir de nouvelles missions en temps réel.
          </Text>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statsHeader}>
            <View style={styles.sectionHeaderInfo}>
              <View style={styles.sectionIconWrapper}>
                <View style={styles.sectionIconGlow} />
                <BarChart3 color="#0A1F44" size={18} />
              </View>
              <View>
                <Text style={[styles.sectionHeaderTitle, styles.statusBadge]}>Statistiques</Text>
                <Text style={styles.sectionHeaderSubtitle}>Performance de vos missions</Text>
              </View>
            </View>
          </View>
          <View style={styles.serviceCard}>
            <View style={styles.statRow}>
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
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{completedServicesCount}</Text>
                <Text style={styles.statLabel}>Missions réalisées</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.missionCard}>
          <View style={styles.missionHeader}>
            <View style={styles.sectionHeaderInfo}>
              <View style={styles.sectionIconWrapper}>
                <View style={styles.sectionIconGlow} />
                <MapPin color="#0A1F44" size={18} />
              </View>
              <View>
                <Text style={[styles.sectionHeaderTitle, styles.statusBadge]}>Mission en cours</Text>
                <Text style={styles.sectionHeaderSubtitle}>Suivez vos interventions actives</Text>
              </View>
            </View>
          </View>

          {activeService && ['accepted', 'in_progress'].includes(activeService.status) ? (
            <View style={styles.missionContent}>
              <View style={styles.serviceHeader}>
                <View style={styles.serviceBadge}>
                  <Text style={styles.serviceBadgeText}>
                    {activeService.status === 'completed'
                      ? 'Terminée'
                      : activeService.status === 'accepted'
                        ? 'Accepté'
                        : 'En cours'}
                  </Text>
                </View>
                <Text style={styles.serviceType}>
                  {activeService.service_type || 'Mission client'}
                </Text>
              </View>
              <Text style={styles.serviceDescription}>
                {activeService.description || 'Aucune description fournie.'}
              </Text>
              <View style={styles.serviceLocation}>
                <MapPin color="#666" size={16} />
                <Text style={styles.serviceLocationText}>
                  {activeService.location_address || 'Adresse client indisponible'}
                </Text>
              </View>
              <View>
                <Text style={styles.serviceDescription}>
                  Client : {(activeService as any).client_name || 'Client'}
                </Text>
                {!!(activeService as any).client_phone && (
                  <Text style={styles.serviceDescription}>
                    Téléphone : {(activeService as any).client_phone}
                  </Text>
                )}
                {typeof (activeService as any).distance_km === 'number' && (
                  <Text style={styles.serviceDescription}>
                    Distance estimée : {(activeService as any).distance_km} km
                  </Text>
                )}
                {typeof (activeService as any).estimated_time === 'number' && (
                  <Text style={styles.serviceDescription}>
                    Durée estimée : {(activeService as any).estimated_time} min
                  </Text>
                )}
              </View>
              <View style={styles.serviceActions}>
                <TouchableOpacity
                  style={[styles.navigateButton, navigatingToActiveService && styles.navigateButtonDisabled]}
                  onPress={handleNavigateToActiveService}
                  disabled={navigatingToActiveService || activeService.status === 'completed'}
                >
                  {navigatingToActiveService ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.navigateButtonText}>
                      {activeService.status === 'completed' ? 'Mission terminée' : 'Voir la navigation'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={[styles.missionContent, styles.missionEmpty]}>
              <View style={styles.sectionIconWrapper}>
                <View style={styles.sectionIconGlow} />
                <MapPin color="#0A1F44" size={22} />
              </View>
              <Text style={styles.emptyStateText}>Aucune mission en cours</Text>
              <Text style={styles.serviceDescription}>
                Acceptez une demande de dépannage pour voir les détails de mission ici.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.requestsCard}>
          <View style={styles.requestsHeader}>
            <View style={styles.sectionHeaderInfo}>
              <View style={styles.sectionIconWrapper}>
                <View style={styles.sectionIconGlow} />
                <MessageCircle color="#0A1F44" size={18} />
              </View>
              <View>
                <Text style={[styles.sectionHeaderTitle, styles.statusBadge]}>Demandes de service</Text>
                <Text style={styles.sectionHeaderSubtitle}>Consultez et gérez les appels entrants</Text>
              </View>
            </View>
          </View>

          <View style={styles.serviceCard}>
            {incomingBreakdown ? (
              <View style={[styles.requestItem, styles.highlightRequestItem]}>
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

            <View style={styles.requestsList}>
              {nearbyBreakdowns.length === 0 ? (
                <View style={styles.requestItem}>
                  <Text style={styles.emptyStateText}>Aucune demande à proximité</Text>
                </View>
              ) : (
                nearbyBreakdowns.map((b) => (
                  <View key={b.id} style={styles.requestItem}>
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
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={notificationsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleDismissNotifications}
      >
        <TouchableWithoutFeedback onPress={handleDismissNotifications}>
          <View style={styles.popoverOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <GestureHandlerRootView style={styles.popoverGestureRoot}>
                <View style={styles.notificationsPopover}>
                  <View style={styles.popoverHeader}>
                    <Text style={styles.popoverTitle}>Notifications</Text>
                    <View style={styles.popoverActions}>
                      <TouchableOpacity
                        onPress={() => {
                          setNotificationsModalVisible(false);
                          openComplaintsDrawer();
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.popoverAction}>Voir tout</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleConfirmNotifications} disabled={markingNotifications}>
                        <Text
                          style={[styles.popoverAction, markingNotifications && styles.popoverActionDisabled]}
                        >
                          {markingNotifications ? '...' : 'Tout lire'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.popoverSubtitle}>
                    {pendingNotifications.length} notification{pendingNotifications.length > 1 ? 's' : ''} en attente
                  </Text>
                  {pendingNotifications.length === 0 ? (
                    <View style={styles.popoverEmpty}>
                      <Text style={styles.popoverEmptyText}>Aucune nouvelle notification.</Text>
                    </View>
                  ) : (
                    <FlatList
                      data={pendingNotifications}
                      keyExtractor={(item) => String(item?._id || item?.id || Math.random())}
                      renderItem={({ item }) => {
                        const id = String(item?._id || item?.id || '');
                        return (
                          <Swipeable
                            renderRightActions={() => (
                              <View style={styles.notificationDeleteContainer}>
                                <RectButton
                                  style={styles.notificationDeleteButton}
                                  onPress={() => handleDeleteNotification(id)}
                                >
                                  <Trash2 color="#fff" size={20} />
                                  <Text style={styles.notificationDeleteText}>Supprimer</Text>
                                </RectButton>
                              </View>
                            )}
                            onSwipeableOpen={(direction) => {
                              if (direction === 'right') {
                                handleDeleteNotification(id);
                              }
                            }}
                            overshootRight={false}
                          >
                            <View
                              style={[
                                styles.notificationCard,
                                removingNotificationId === id && styles.notificationCardRemoving,
                              ]}
                            >
                              <Text style={styles.notificationTitle}>{item?.title || 'Notification'}</Text>
                              <Text style={styles.notificationContent}>{item?.content || ''}</Text>
                              {item?.sentAt ? (
                                <Text style={styles.notificationTime}>
                                  {new Date(item.sentAt).toLocaleString()}
                                </Text>
                              ) : null}
                            </View>
                          </Swipeable>
                        );
                      }}
                      style={styles.popoverList}
                      contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
                      showsVerticalScrollIndicator={false}
                    />
                  )}
                  <TouchableOpacity style={styles.popoverClose} onPress={handleDismissNotifications}>
                    <Text style={styles.popoverCloseText}>Fermer</Text>
                  </TouchableOpacity>
                </View>
              </GestureHandlerRootView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>


      {/* Bouton flottant pour la messagerie */}
      <TouchableOpacity
        style={[styles.floatingButton, { backgroundColor: '#007AFF' }]}
        onPress={() => router.push('/(mechanic)/(tabs)/messages' as any)}
        activeOpacity={0.8}
      >
        <MessageCircle color="#FFFFFF" size={24} />
        {unreadMessages > 0 ? (
          <View style={styles.floatingBadge}>
            <Text style={styles.floatingBadgeText}>{unreadMessages > 9 ? '9+' : unreadMessages}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: ClientThemeColors) => {
  const accent = colors.accent;
  const accentContrast = colors.accentContrast;
  const textPrimary = colors.textPrimary;
  const textSecondary = colors.textSecondary;
  const background = colors.background;
  const surface = colors.surface;
  const surfaceAlt = colors.surfaceAlt;
  const card = colors.card;
  const cardBorder = colors.cardBorder;
  const border = colors.border;
  const accentSoft = 'rgba(56,189,248,0.18)';
  const successSoft = 'rgba(34,197,94,0.16)';
  const infoSoft = 'rgba(59,130,246,0.14)';

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 60,
      paddingBottom: 16,
      paddingHorizontal: 16,
      backgroundColor: '#007AFF',
      borderBottomWidth: 0,
    },
    headerButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 8,
      marginLeft: 12,
      position: 'relative',
      backgroundColor: 'transparent',
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
    headerCenter: {
      alignItems: 'center',
    },
    logo: {
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight: '700',
    },
    locationPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.18)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.18)',
    },
    locationPillText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '500',
      maxWidth: 170,
    },
    headerRight: {
      flexDirection: 'row',
      gap: 8,
    },
    content: {
      flex: 1,
    },
    locationPrompt: {
      backgroundColor: surfaceAlt,
      borderColor: border,
      borderWidth: 1,
      marginHorizontal: 16,
      marginTop: 8,
      padding: 12,
      borderRadius: 10,
    },
    locationPromptText: {
      color: textSecondary,
      fontSize: 12,
      marginBottom: 8,
    },
    locationPromptBtn: {
      alignSelf: 'flex-start',
      backgroundColor: accent,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    locationPromptBtnText: {
      color: accentContrast,
      fontSize: 12,
      fontWeight: '600',
    },
    welcomeCard: {
      backgroundColor: surface,
      marginHorizontal: 16,
      marginTop: 16,
      marginBottom: 8,
      padding: 20,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: cardBorder,
    },
    welcomeText: {
      color: textPrimary,
      fontWeight: '700',
      fontSize: 20,
      marginBottom: 4,
    },
    welcomeSubtext: {
      color: textSecondary,
      fontSize: 14,
    },
    statusCard: {
      margin: 16,
      padding: 18,
      borderRadius: 18,
      backgroundColor: card,
      borderWidth: 1,
      borderColor: cardBorder,
      gap: 16,
    },
    statusHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 16,
    },
    statusInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    statusIconWrapper: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: successSoft,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    statusIconGlow: {
      position: 'absolute',
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(34,197,94,0.25)',
      opacity: 0.6,
    },
    statusTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: textPrimary,
      marginBottom: 4,
    },
    statusBadge: {
      alignSelf: 'flex-start',
      backgroundColor: surfaceAlt,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: border,
    },
    statusSubtitle: {
      fontSize: 13,
      fontWeight: '600',
      color: textPrimary,
    },
    statusSwitchWrapper: {
      alignItems: 'center',
      gap: 6,
    },
    statusSwitchLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: textSecondary,
      letterSpacing: 1,
    },
    statusHint: {
      fontSize: 12,
      color: textSecondary,
    },
    sectionHeaderRow: {
      marginHorizontal: 16,
      marginTop: 8,
      marginBottom: 10,
    },
    sectionHeaderInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    sectionIconWrapper: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: successSoft,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    sectionIconGlow: {
      position: 'absolute',
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(34,197,94,0.25)',
      opacity: 0.6,
    },
    sectionHeaderTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: textPrimary,
    },
    sectionHeaderSubtitle: {
      fontSize: 12,
      color: textSecondary,
    },
    statsCard: {
      marginHorizontal: 16,
      marginBottom: 16,
      padding: 18,
      borderRadius: 18,
      backgroundColor: card,
      borderWidth: 1,
      borderColor: cardBorder,
      gap: 16,
    },
    statsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    statRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    statItem: {
      alignItems: 'center',
      flex: 1,
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
      height: '60%',
      backgroundColor: '#E0E0E0',
    },
    missionCard: {
      marginHorizontal: 16,
      marginBottom: 24,
      padding: 18,
      borderRadius: 18,
      backgroundColor: '#E6F0FF',
      borderWidth: 1,
      borderColor: '#B3D4FF',
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 8,
      elevation: 3,
      gap: 16,
    },
    missionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    missionContent: {
      backgroundColor: '#FFFFFF',
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: '#B3D4FF',
      gap: 12,
    },
    missionEmpty: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    missionTitleBadge: {
      backgroundColor: '#34C759',
      color: '#FFFFFF',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      overflow: 'hidden',
      alignSelf: 'flex-start',
    },
    missionIconWrapper: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#DCFCE7',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    missionIconGlow: {
      position: 'absolute',
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#BBF7D0',
      opacity: 0.6,
    },
    requestsCard: {
      marginHorizontal: 16,
      marginBottom: 24,
      padding: 18,
      borderRadius: 18,
      backgroundColor: '#E6F0FF',
      borderWidth: 1,
      borderColor: '#B3D4FF',
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 8,
      elevation: 3,
      gap: 16,
    },
    requestsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    archiveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(10,31,68,0.08)',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 16,
    },
    archiveButtonText: {
      color: '#0A1F44',
      fontSize: 12,
      fontWeight: '600',
    },
    archiveButtonTextDisabled: {
      color: '#94A3B8',
    },
    requestsList: {
      gap: 12,
    },
    requestItem: {
      backgroundColor: '#FFFFFF',
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: '#D4E7FF',
      gap: 10,
    },
    highlightRequestItem: {
      borderColor: '#2563EB',
      backgroundColor: '#EBF2FF',
    },
    compactCardContainer: {
      backgroundColor: '#FFFFFF',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: '#D4E7FF',
      padding: 16,
      gap: 14,
    },
    compactRequestItem: {
      backgroundColor: '#F8FBFF',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#E1ECFF',
      padding: 14,
      gap: 10,
    },
    compactItemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    compactTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    compactTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: '#0A1F44',
    },
    compactBadge: {
      fontSize: 12,
      fontWeight: '600',
      color: '#1D4ED8',
      backgroundColor: 'rgba(29,78,216,0.12)',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
    },
    compactClientRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    incomingAvatarSmall: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#E0F2FE',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    compactClientName: {
      fontSize: 14,
      fontWeight: '600',
      color: '#0F172A',
    },
    compactClientPhone: {
      fontSize: 14,
      color: '#0F172A',
    },
    incomingHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      padding: 16,
      backgroundColor: surfaceAlt,
      borderBottomWidth: 1,
      borderBottomColor: border,
    },
    incomingTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: textPrimary,
    },
    incomingDistance: {
      fontSize: 14,
      color: textSecondary,
    },
    incomingClientRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 16,
    },
    incomingAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#E0F2FE',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    incomingAvatarImage: {
      width: 44,
      height: 44,
      borderRadius: 22,
    },
    incomingAvatarInitials: {
      fontSize: 18,
      fontWeight: '600',
      color: '#0A1F44',
    },
    incomingClientName: {
      fontSize: 16,
      fontWeight: '600',
      color: textPrimary,
    },
    incomingClientPhone: {
      fontSize: 14,
      color: textSecondary,
    },
    incomingDescription: {
      fontSize: 14,
      color: textSecondary,
      padding: 16,
    },
    incomingInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 16,
    },
    incomingInfoText: {
      fontSize: 14,
      color: textSecondary,
    },
    incomingActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      padding: 16,
    },
    declineButton: {
      backgroundColor: '#F8F8F8',
      borderRadius: 8,
      padding: 12,
      flex: 1,
    },
    declineButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#666',
    },
    acceptButton: {
      backgroundColor: accent,
      borderRadius: 8,
      padding: 12,
      flex: 1,
    },
    acceptButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: accentContrast,
    },
    floatingButton: {
      position: 'absolute',
      bottom: 16,
      right: 16,
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 8,
      elevation: 3,
    },
    floatingBadge: {
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
    floatingBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    popoverOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    popoverGestureRoot: {
      backgroundColor: 'transparent',
    },
    notificationsPopover: {
      backgroundColor: surface,
      borderRadius: 18,
      padding: 20,
      maxWidth: 300,
    },
    popoverHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 16,
    },
    popoverTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: textPrimary,
    },
    popoverActions: {
      flexDirection: 'row',
      gap: 12,
    },
    popoverAction: {
      fontSize: 14,
      fontWeight: '600',
      color: textPrimary,
    },
    popoverActionDisabled: {
      color: '#94A3B8',
    },
    popoverSubtitle: {
      fontSize: 14,
      color: textSecondary,
      marginBottom: 16,
    },
    popoverEmpty: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    popoverEmptyText: {
      fontSize: 14,
      color: textSecondary,
    },
    popoverList: {
      gap: 10,
    },
    notificationCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: '#D4E7FF',
      gap: 10,
    },
    notificationCardRemoving: {
      backgroundColor: '#F8F8F8',
    },
    notificationTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: textPrimary,
    },
    notificationContent: {
      fontSize: 14,
      color: textSecondary,
    },
    notificationTime: {
      fontSize: 12,
      color: textSecondary,
    },
    notificationDeleteContainer: {
      backgroundColor: '#EF4444',
      borderRadius: 14,
      padding: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    notificationDeleteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 12,
    },
    notificationDeleteText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    popoverClose: {
      position: 'absolute',
      top: 16,
      right: 16,
    },
    statItem: {
    alignItems: 'center',
    flex: 1,
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
    height: '60%',
    backgroundColor: '#E0E0E0',
  },
  missionCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#E6F0FF',
    borderWidth: 1,
    borderColor: '#B3D4FF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
    gap: 16,
  },
  missionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  missionContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#B3D4FF',
    gap: 12,
  },
  missionEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  missionTitleBadge: {
    backgroundColor: '#34C759',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  missionIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  missionIconGlow: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#BBF7D0',
    opacity: 0.6,
  },
  requestsCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#E6F0FF',
    borderWidth: 1,
    borderColor: '#B3D4FF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
    gap: 16,
  },
  requestsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  archiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(10,31,68,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  archiveButtonText: {
    color: '#0A1F44',
    fontSize: 12,
    fontWeight: '600',
  },
  archiveButtonTextDisabled: {
    color: '#94A3B8',
  },
  requestsList: {
    gap: 12,
  },
  requestItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D4E7FF',
    gap: 10,
  },
  highlightRequestItem: {
    borderColor: '#2563EB',
    backgroundColor: '#EBF2FF',
  },
  compactCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D4E7FF',
    padding: 16,
    gap: 14,
  },
  compactRequestItem: {
    backgroundColor: '#F8FBFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E1ECFF',
    padding: 14,
    gap: 10,
  },
  compactItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0A1F44',
  },
  compactBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1D4ED8',
    backgroundColor: 'rgba(29,78,216,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  compactClientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  incomingAvatarSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  compactClientName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  compactClientPhone: {
    fontSize: 12,
    color: '#475569',
  },
  compactDescription: {
    fontSize: 13,
    color: '#334155',
  },
  compactMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactMetaText: {
    fontSize: 12,
    color: '#475569',
  },
  compactActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  compactButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  compactButtonPrimary: {
    backgroundColor: '#0A84FF',
  },
  compactButtonSecondary: {
    backgroundColor: '#EFF4FF',
  },
  compactButtonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  compactButtonSecondaryText: {
    color: '#1D4ED8',
    fontSize: 13,
    fontWeight: '600',
  },
  compactList: {
    gap: 12,
  },
  compactEmpty: {
    paddingVertical: 24,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  archivedContainer: {
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    paddingTop: 12,
    gap: 10,
  },
  archivedTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  archivedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  archivedItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  archivedItemMeta: {
    fontSize: 12,
    color: '#64748B',
  },
  archivedRestoreButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1D4ED8',
  },
  archivedRestoreText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '600',
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
  navigateButtonDisabled: {
    opacity: 0.6,
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
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#707070',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  notificationsModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '75%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0A1F44',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#475569',
    marginTop: 4,
    marginBottom: 16,
  },
  notificationCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#F8FAFC',
  },
  notificationCardRemoving: {
    opacity: 0.5,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  notificationContent: {
    fontSize: 13,
    color: '#1E293B',
    marginBottom: 6,
  },
  notificationTime: {
    fontSize: 12,
    color: '#64748B',
  },
  notificationDeleteContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    marginVertical: 2,
  },
  notificationDeleteButton: {
    width: 100,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginVertical: 2,
    marginRight: 2,
  },
  notificationDeleteText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    minWidth: 120,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A1F44',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalButtonSecondary: {
    backgroundColor: '#E2E8F0',
  },
  modalButtonSecondaryText: {
    color: '#1F2937',
  },
  disabledButton: {
    opacity: 0.6,
  },
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  drawerContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0A1F44',
  },
  drawerClose: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  drawerSubtitle: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 16,
  },
  drawerLoading: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerEmptyState: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerEmptyText: {
    fontSize: 14,
    color: '#64748B',
  },
  drawerList: {
    paddingBottom: 16,
    gap: 12,
  },
  complaintItem: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#F8FAFC',
    marginBottom: 12,
  },
  complaintHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  complaintTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  complaintStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  complaintStatusDotUnread: {
    backgroundColor: '#DC2626',
  },
  complaintStatusDotRead: {
    backgroundColor: '#CBD5F5',
  },
  complaintTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  complaintTitleUnread: {
    fontWeight: '800',
  },
  complaintDate: {
    fontSize: 12,
    color: '#64748B',
  },
  complaintMessage: {
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 6,
  },
  complaintMessageUnread: {
    fontWeight: '600',
  },
  complaintDest: {
    fontSize: 12,
    color: '#475569',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 95,
    right: 16,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 6,
  },
  floatingBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  floatingBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  popoverOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 85,
    paddingRight: 12,
  },
  notificationsPopover: {
    width: 280,
    maxHeight: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  popoverGestureRoot: {
    borderRadius: 16,
  },
  popoverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  popoverTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  popoverActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  popoverAction: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  popoverActionDisabled: {
    color: '#94A3B8',
  },
  popoverSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
  },
  popoverEmpty: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popoverEmptyText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  popoverList: {
    maxHeight: 220,
  },
  popoverClose: {
    alignSelf: 'flex-end',
    marginTop: 12,
  },
  popoverCloseText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
});
};

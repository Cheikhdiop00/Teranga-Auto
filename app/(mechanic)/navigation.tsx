import { useEffect, useMemo, useState, useCallback } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, Linking, Platform, Alert } from 'react-native';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { ArrowLeft, Navigation2, Phone } from 'lucide-react-native';

type Params = {
  breakdownId?: string;
  clientName?: string;
  clientLat?: string | string[];
  clientLng?: string | string[];
  clientPhone?: string | string[];
  description?: string | string[];
  distanceKm?: string | string[];
  etaMin?: string | string[];
  mechanicLat?: string | string[];
  mechanicLng?: string | string[];
};

type LatLng = { latitude: number; longitude: number };

const toNumber = (value: string | string[] | undefined): number | null => {
  if (!value) return null;
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = parseFloat(String(raw));
  return Number.isFinite(parsed) ? parsed : null;
};

const formatKm = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value.toFixed(1)} km`;
};

const formatMinutes = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${Math.round(value)} min`;
};

const haversineKm = (a: LatLng, b: LatLng) => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
};

export default function MechanicNavigationScreen() {
  const params = useLocalSearchParams<Params>();
  const router = useRouter();
  const [mechanicPosition, setMechanicPosition] = useState<LatLng | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(null);
  const [routeDurationMin, setRouteDurationMin] = useState<number | null>(null);
  const [routeGeometry, setRouteGeometry] = useState<LatLng[] | null>(null);

  const clientPosition = useMemo<LatLng | null>(() => {
    const lat = toNumber(params.clientLat);
    const lng = toNumber(params.clientLng);
    if (lat == null || lng == null) return null;
    return { latitude: lat, longitude: lng };
  }, [params.clientLat, params.clientLng]);

  const fallbackDistance = useMemo(() => {
    if (routeDistanceKm != null) return routeDistanceKm;
    const provided = toNumber(params.distanceKm);
    if (provided != null) return provided;
    if (clientPosition && mechanicPosition) {
      return haversineKm(mechanicPosition, clientPosition);
    }
    return null;
  }, [clientPosition, mechanicPosition, params.distanceKm, routeDistanceKm]);

  const fallbackEta = useMemo(() => {
    if (routeDurationMin != null) return routeDurationMin;
    const provided = toNumber(params.etaMin);
    if (provided != null) return provided;
    if (!fallbackDistance) return null;
    const avgSpeedKmH = 30;
    return (fallbackDistance / avgSpeedKmH) * 60;
  }, [fallbackDistance, params.etaMin, routeDurationMin]);

  const decodePolyline = useCallback((encoded: string): LatLng[] => {
    const coordinates: LatLng[] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      let b;
      let shift = 0;
      let result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dLat = (result & 1) ? ~(result >> 1) : (result >> 1);
      lat += dLat;

      shift = 0;
      result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dLng = (result & 1) ? ~(result >> 1) : (result >> 1);
      lng += dLng;

      coordinates.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }

    return coordinates;
  }, []);

  const fetchRoute = useCallback(async (origin: LatLng, destination: LatLng) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=polyline&steps=false`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Direction service unavailable');
      const data = await response.json();
      const route = data?.routes?.[0];
      if (!route) throw new Error('Route not found');
      setRouteDistanceKm(route.distance ? route.distance / 1000 : null);
      setRouteDurationMin(route.duration ? route.duration / 60 : null);
      if (route.geometry) {
        setRouteGeometry(decodePolyline(route.geometry));
      }
    } catch (error) {
      console.warn('Failed to fetch directions, falling back to haversine', error);
      setRouteGeometry(null);
      setRouteDistanceKm(null);
      setRouteDurationMin(null);
    }
  }, [decodePolyline]);

  useEffect(() => {
    let active = true;
    const ensureMechanicLocation = async () => {
      if (mechanicPosition) return;
      const lat = toNumber(params.mechanicLat);
      const lng = toNumber(params.mechanicLng);
      if (lat != null && lng != null) {
        setMechanicPosition({ latitude: lat, longitude: lng });
        return;
      }
      try {
        setLoadingLocation(true);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Localisation', 'Autorisez la localisation pour afficher votre position.');
          return;
        }
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          Alert.alert('Localisation', 'Activez le GPS pour afficher le trajet.');
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (active && pos?.coords) {
          setMechanicPosition({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        }
      } catch (error) {
        console.warn('Unable to fetch mechanic location', error);
      } finally {
        if (active) setLoadingLocation(false);
      }
    };
    ensureMechanicLocation();
    return () => {
      active = false;
    };
  }, [mechanicPosition, params.mechanicLat, params.mechanicLng]);

  const region: Region | undefined = useMemo(() => {
    const points = [clientPosition, mechanicPosition].filter(Boolean) as LatLng[];
    if (points.length === 0) return undefined;
    if (points.length === 1) {
      const [{ latitude, longitude }] = points;
      return {
        latitude,
        longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    const lats = points.map((p) => p.latitude);
    const lngs = points.map((p) => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const midLat = (minLat + maxLat) / 2;
    const midLng = (minLng + maxLng) / 2;
    const deltaLat = (maxLat - minLat) * 1.4 || 0.05;
    const deltaLng = (maxLng - minLng) * 1.4 || 0.05;
    return {
      latitude: midLat,
      longitude: midLng,
      latitudeDelta: Math.max(deltaLat, 0.02),
      longitudeDelta: Math.max(deltaLng, 0.02),
    };
  }, [clientPosition, mechanicPosition]);

  useEffect(() => {
    if (!clientPosition || !mechanicPosition) return;
    fetchRoute(mechanicPosition, clientPosition);
  }, [clientPosition, mechanicPosition, fetchRoute]);

  useEffect(() => {
    // Retry fetching mechanic position if missing every few seconds until found
    if (mechanicPosition) return;
    const timer = setInterval(() => {
      if (!mechanicPosition) {
        (async () => {
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            const servicesEnabled = await Location.hasServicesEnabledAsync();
            if (!servicesEnabled) return;
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            if (pos?.coords) {
              setMechanicPosition({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
            }
          } catch {}
        })();
      }
    }, 6000);

    return () => clearInterval(timer);
  }, [mechanicPosition]);

  const routeCoordinates = useMemo(() => {
    if (routeGeometry && routeGeometry.length > 1) return routeGeometry;
    const coords: LatLng[] = [];
    if (mechanicPosition) coords.push(mechanicPosition);
    if (clientPosition) coords.push(clientPosition);
    return coords;
  }, [clientPosition, mechanicPosition, routeGeometry]);

  const handleBack = () => router.back();

  const handleOpenExternalNavigation = () => {
    if (!clientPosition) {
      Alert.alert('Navigation', 'Coordonnées client indisponibles.');
      return;
    }
    const mech = mechanicPosition;
    const origin = mech ? `${mech.latitude},${mech.longitude}` : '';
    const destination = `${clientPosition.latitude},${clientPosition.longitude}`;
    const url = Platform.select({
      ios: `http://maps.apple.com/?daddr=${destination}${origin ? `&saddr=${origin}` : ''}`,
      android: `https://www.google.com/maps/dir/?api=1&destination=${destination}${origin ? `&origin=${origin}` : ''}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${destination}${origin ? `&origin=${origin}` : ''}`,
    });
    Linking.openURL(url ?? '').catch(() => {
      Alert.alert('Navigation', 'Impossible d\'ouvrir l\'application de navigation.');
    });
  };

  const handleCallClient = () => {
    const phone = params.clientPhone;
    const value = Array.isArray(phone) ? phone[0] : phone;
    if (!value) {
      Alert.alert('Contact', 'Numéro de téléphone client indisponible.');
      return;
    }
    Linking.openURL(`tel:${value}`).catch(() => {
      Alert.alert('Contact', 'Impossible de lancer l\'appel.');
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <ArrowLeft size={22} color="#0A1F44" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Navigation</Text>
        <View style={{ width: 36 }} />
      </View>

      {region ? (
        <MapView style={styles.map} initialRegion={region}>
          {mechanicPosition ? (
            <Marker coordinate={mechanicPosition} pinColor="#0A1F44" title="Vous" />
          ) : null}
          {clientPosition ? (
            <Marker coordinate={clientPosition} pinColor="#d97706" title="Client" />
          ) : null}
          {routeCoordinates.length >= 2 ? (
            <Polyline
              coordinates={routeCoordinates}
              strokeColor="#0A1F44"
              strokeWidth={4}
              lineDashPattern={[10, 5]}
            />
          ) : null}
        </MapView>
      ) : (
        <View style={[styles.map, styles.mapFallback]}>
          <Text style={styles.mapFallbackText}>
            {loadingLocation ? 'Récupération de votre position…' : 'Impossible d\'afficher la carte.'}
          </Text>
        </View>
      )}

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.clientName}>{Array.isArray(params.clientName) ? params.clientName[0] : params.clientName || 'Client'}</Text>
          <TouchableOpacity style={styles.callButton} onPress={handleCallClient}>
            <Phone size={18} color="#fff" />
            <Text style={styles.callButtonText}>Appeler</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.description} numberOfLines={2}>
          {Array.isArray(params.description) ? params.description[0] : params.description || 'Panne signalée'}
        </Text>
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Distance</Text>
            <Text style={styles.metricValue}>{formatKm(fallbackDistance)}</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Durée</Text>
            <Text style={styles.metricValue}>{formatMinutes(fallbackEta)}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.navigateButton} onPress={handleOpenExternalNavigation}>
          <Navigation2 size={18} color="#fff" />
          <Text style={styles.navigateButtonText}>Ouvrir dans Maps</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0A1F44',
  },
  map: {
    flex: 1,
  },
  mapFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5e7eb',
  },
  mapFallbackText: {
    color: '#4B5563',
    fontSize: 14,
  },
  infoCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#0A1F44',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clientName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0A1F44',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#0A1F44',
  },
  callButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#4B5563',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0A1F44',
    marginTop: 4,
  },
  separator: {
    width: 1,
    height: '60%',
    backgroundColor: '#E5E7EB',
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#2563EB',
  },
  navigateButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});

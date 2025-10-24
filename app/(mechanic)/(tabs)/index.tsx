import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, Switch, useColorScheme, Linking } from 'react-native';
import { useEffect } from 'react';
import { Menu, Bell, MessageCircle, Search, MapPin } from 'lucide-react-native';
import Sidebar from '@/components/Sidebar';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getCollection } from '@/lib/supabase';
import { Service } from '@/types/database';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/config/api';

export default function MechanicHomeScreen() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const colorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(colorScheme === 'dark');
  const [locationText, setLocationText] = useState<string>('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
    // Ici, vous pouvez ajouter la logique pour sauvegarder la préférence de thème
  };

  const loadNearbyBreakdowns = async (lat: number, lng: number) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const res = await fetch(`${API_URL}/api/breakdowns/nearby?lat=${lat}&lng=${lng}&radiusKm=20`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error('Failed to load nearby breakdowns');
      const data = await res.json();
      setNearbyBreakdowns((data.data || []) as NearbyBreakdown[]);
    } catch (e) {
      setNearbyBreakdowns([]);
    }
  };

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
      const token = await AsyncStorage.getItem('authToken');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      // Récupérer la liste des mécaniciens et trouver celui lié à l'utilisateur courant
      const listRes = await fetch(`${API_URL}/api/mechanics`, { headers });
      if (!listRes.ok) return;
      const mechanics = await listRes.json();
      const currentUserId = (profile as any)?.id || (profile as any)?._id;
      const me = Array.isArray(mechanics) ? mechanics.find((m: any) => String(m.user) === String(currentUserId)) : null;
      if (!me || !me._id) return;

      await fetch(`${API_URL}/api/mechanics/${me._id}`, {
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
  const { profile, updateProfile } = useAuth();
  const [isAvailable, setIsAvailable] = useState(profile?.is_available || false);
  const [pendingServices, setPendingServices] = useState<Service[]>([]);
  const [activeService, setActiveService] = useState<Service | null>(null);
  type NearbyBreakdown = {
    id: string;
    clientName: string;
    description: string;
    latitude: number;
    longitude: number;
    distanceKm: number;
    estimatedDurationMin: number;
    reportedAt?: string;
    status: string;
  };
  const [nearbyBreakdowns, setNearbyBreakdowns] = useState<NearbyBreakdown[]>([]);

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

  const refreshLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationText('Localisation désactivée');
        setLocationGranted(false);
        return;
      }
      setLocationGranted(true);
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
      } else {
        setLocationText('Localisation indisponible');
      }
    } catch {
      setLocationText('Localisation indisponible');
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
          <TouchableOpacity style={styles.headerButton}>
            <Bell color="white" size={24} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <MessageCircle color="white" size={24} />
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
            <Text style={styles.statValue}>{profile?.rating_count || 0}</Text>
            <Text style={styles.statLabel}>Interventions</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              ⭐ {profile?.rating_average.toFixed(1) || '0.0'}
            </Text>
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
    padding: 8,
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
});

import { useState, useEffect, useRef } from 'react';
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
import { api } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/config/api';
import { Profile } from '@/types/database';

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

export default function ClientHomeScreen() {
  const { profile } = useAuth();
  const [mechanics, setMechanics] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const servicesAnimation = useRef(new Animated.Value(0)).current;
  const [locationText, setLocationText] = useState<string>('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

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
          // Sauvegarder la position (adresse + coordonnées)
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
      // Récupérer le token d'auth et lister les clients pour trouver le client lié à l'utilisateur courant
      const token = await AsyncStorage.getItem('authToken');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const listRes = await fetch(`${API_URL}/api/clients`, { headers });
      if (!listRes.ok) return;
      const clients = await listRes.json();
      // Trouver le document client dont le champ user correspond à l'utilisateur courant
      const currentUserId = (profile as any)?.id || (profile as any)?._id;
      const me = Array.isArray(clients) ? clients.find((c: any) => String(c.user) === String(currentUserId)) : null;
      if (!me || !me._id) return;

      // Mettre à jour latitude/longitude et adresse
      await fetch(`${API_URL}/api/clients/${me._id}`, {
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
      const list = await api.mechanics.list();
      // list is an array of mechanics documents (server model). Map to Profile shape.
      let mapped: Profile[] = (Array.isArray(list) ? list : []).map((m: any) => ({
        id: m._id || m.id,
        user_type: 'mechanic',
        first_name: m.user?.firstName || m.firstName || 'Mécano',
        last_name: m.user?.lastName || m.lastName || '',
        phone: m.user?.phoneNumber || m.phoneNumber || '',
        address: m.address || '',
        photo_url: m.user?.profilePhoto || undefined,
        id_card_number: m.nationalId,
        specialties: m.specialties || [],
        is_available: m.is_available ?? true,
        rating_average: m.rating_average ?? 0,
        rating_count: m.rating_count ?? 0,
        latitude: m.latitude ?? 0,
        longitude: m.longitude ?? 0,
        is_blocked: false,
        created_at: m.createdAt || new Date().toISOString(),
        updated_at: m.updatedAt || new Date().toISOString(),
      }));

      if (selectedType) {
        mapped = mapped.filter((p) => (p.specialties || []).includes(selectedType));
      }

      // Top 10 by rating
      mapped.sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0));
      setMechanics(mapped.slice(0, 10));
    } catch (error) {
      console.error('Error loading mechanics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestService = (mechanic: Profile) => {
    Alert.alert(
      'Demander un service',
      `Voulez-vous demander un service à ${mechanic.first_name} ${mechanic.last_name} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', onPress: () => console.log('Service requested') },
      ]
    );
  };

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
          <TouchableOpacity style={styles.headerButton}>
            <MessageCircle color="#000" size={24} />
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
          {mechanics.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Aucun mécanicien disponible
              </Text>
            </View>
          ) : (
            mechanics.map((mechanic) => (
              <View key={mechanic.id} style={styles.mechanicCard}>
                <View style={styles.mechanicHeader}>
                  <View style={styles.mechanicAvatar}>
                    <Text style={styles.mechanicAvatarText}>
                      {mechanic.first_name[0]}
                      {mechanic.last_name[0]}
                    </Text>
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
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
  },
});

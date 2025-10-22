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
} from 'react-native';
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
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
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

  const loadMechanics = async () => {
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('user_type', 'mechanic')
        .eq('is_available', true)
        .eq('is_blocked', false)
        .order('rating_average', { ascending: false });

      if (selectedType) {
        query = query.contains('specialties', [selectedType]);
      }

      const { data, error } = await query.limit(10);

      if (error) throw error;
      setMechanics(data || []);
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
          <Text style={styles.location}>Dakar, Sénégal</Text>
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

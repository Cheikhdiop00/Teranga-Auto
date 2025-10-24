import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, Switch, useColorScheme } from 'react-native';
import { useEffect } from 'react';
import { Menu, Bell, MessageCircle, Search, MapPin } from 'lucide-react-native';
import Sidebar from '@/components/Sidebar';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getCollection } from '@/lib/supabase';
import { Service } from '@/types/database';

export default function MechanicHomeScreen() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const colorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(colorScheme === 'dark');

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
    // Ici, vous pouvez ajouter la logique pour sauvegarder la préférence de thème
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  const { profile, updateProfile } = useAuth();
  const [isAvailable, setIsAvailable] = useState(profile?.is_available || false);
  const [pendingServices, setPendingServices] = useState<Service[]>([]);
  const [activeService, setActiveService] = useState<Service | null>(null);

  useEffect(() => {
    loadServices();
  }, []);

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
          <Text style={styles.subtitle}>Mécanicien</Text>
        </View>
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
          {pendingServices.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Aucune demande en attente</Text>
            </View>
          ) : (
            pendingServices.map((service) => (
              <View key={service.id} style={styles.serviceCard}>
                <View style={styles.serviceHeader}>
                  <Text style={styles.serviceType}>{service.service_type}</Text>
                  <Text style={styles.serviceDistance}>
                    {service.distance_km?.toFixed(1)} km
                  </Text>
                </View>
                <Text style={styles.serviceDescription}>
                  {service.description}
                </Text>
                <View style={styles.serviceLocation}>
                  <MapPin color="#666" size={16} />
                  <Text style={styles.serviceLocationText}>
                    {service.location_address}
                  </Text>
                </View>
                <View style={styles.serviceActions}>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleAcceptService(service.id)}
                  >
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

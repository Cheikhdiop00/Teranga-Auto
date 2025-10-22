import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  RefreshControl,
  Linking,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import {
  AlertCircle,
  Bell,
  ClipboardList,
  Clock,
  Info,
  LogOut,
  Menu,
  Moon,
  BarChart,
  ShieldCheck,
  Users,
  Wrench,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function AdminDashboardScreen() {
  const { profile, signOut } = useAuth();
  const [stats, setStats] = useState({
    totalClients: 0,
    totalMechanics: 0,
    totalServices: 0,
    totalReports: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentServices, setRecentServices] = useState<any[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const menuProgress = useRef(new Animated.Value(0)).current;
  const drawerWidth = Math.min(Dimensions.get('window').width * 0.6, 240);
  const menuTranslate = menuProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-drawerWidth, 0],
  });

  const theme = isDarkMode
    ? {
        background: '#121212',
        headerBackground: '#1F1F1F',
        borderColor: '#2C2C2E',
        textPrimary: '#FFFFFF',
        textSecondary: '#A0A0A0',
        cardBackground: '#1F1F1F',
        menuBackground: '#2C2C2E',
        iconColor: '#FFFFFF',
      }
    : {
        background: '#F5F5F5',
        headerBackground: '#FFFFFF',
        borderColor: '#E0E0E0',
        textPrimary: '#000000',
        textSecondary: '#666666',
        cardBackground: '#FFFFFF',
        menuBackground: '#FFFFFF',
        iconColor: '#000000',
      };

  const handleToggleTheme = () => {
    setIsDarkMode((prev) => !prev);
    setIsMenuOpen(false);
  };

  const handleOpenDocs = () => {
    setIsMenuOpen(false);
    Linking.openURL('https://example.com/documentation').catch(() => {});
  };

  const handleViewHistory = () => {
    setIsMenuOpen(false);
    Linking.openURL('https://example.com/historique').catch(() => {});
  };

  const handleSignOut = async () => {
    setIsMenuOpen(false);
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  useEffect(() => {
    Animated.timing(menuProgress, {
      toValue: isMenuOpen ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [isMenuOpen, menuProgress]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [clientsRes, mechanicsRes, servicesRes, reportsRes, recentRes] =
        await Promise.all([
          supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('user_type', 'client'),
          supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('user_type', 'mechanic'),
          supabase
            .from('services')
            .select('id', { count: 'exact', head: true }),
          supabase
            .from('reports')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending'),
          supabase
            .from('services')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5),
        ]);

      setStats({
        totalClients: clientsRes.count || 0,
        totalMechanics: mechanicsRes.count || 0,
        totalServices: servicesRes.count || 0,
        totalReports: reportsRes.count || 0,
      });

      setRecentServices(recentRes.data || []);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View
        style={[styles.header, { backgroundColor: '#0A1F44', borderBottomColor: '#0A1F44' }]}
      >
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setIsMenuOpen((prev) => !prev)}
        >
          <Menu color="#FFFFFF" size={24} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.logo, { color: 'white' }]}>TerangaAuto</Text>
          <Text style={[styles.subtitle, { color: 'white' }]}>Administration</Text>
        </View>
        <TouchableOpacity style={styles.headerButton}>
          <Bell color="#FFFFFF" size={24} />
        </TouchableOpacity>
      </View>

      {isMenuOpen && (
        <TouchableWithoutFeedback onPress={() => setIsMenuOpen(false)}>
          <Animated.View style={[styles.menuOverlay, { opacity: menuProgress }]} />
        </TouchableWithoutFeedback>
      )}

      <Animated.View
        pointerEvents={isMenuOpen ? 'auto' : 'none'}
        style={[
          styles.menuContainer,
          {
            backgroundColor: theme.menuBackground,
            borderColor: theme.borderColor,
            opacity: menuProgress,
            width: drawerWidth,
            transform: [{ translateX: menuTranslate }],
          },
        ]}
      >
        <TouchableOpacity style={styles.menuItem} onPress={handleToggleTheme}>
          <View style={styles.menuItemContent}>
            <Moon color="#0A1F44" size={20} />
            <Text style={styles.menuItemLabel}>{isDarkMode ? 'Mode clair' : 'Mode sombre'}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={handleOpenDocs}>
          <View style={styles.menuItemContent}>
            <Info color="#0A1F44" size={20} />
            <Text style={styles.menuItemLabel}>À propos</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={handleViewHistory}>
          <View style={styles.menuItemContent}>
            <Clock color="#0A1F44" size={20} />
            <Text style={styles.menuItemLabel}>Historique</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem, styles.menuItemDanger]} onPress={handleSignOut}>
          <View style={styles.menuItemContent}>
            <LogOut color="#FFFFFF" size={20} />
            <Text style={[styles.menuItemLabel, styles.menuItemDangerLabel]}>Déconnexion</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        style={[styles.content, { backgroundColor: theme.background }]}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadStats} />
        }
      >
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeHeader}>
            <ShieldCheck color="#FFFFFF" size={28} style={styles.welcomeBadgeIcon} />
            <Text style={styles.welcomeText}>
              Bienvenue, {profile?.first_name} !
            </Text>
          </View>
          <Text style={styles.welcomeSubtext}>
            Tableau de bord administrateur
          </Text>
        </View>

        <View style={styles.statsCardContainer}>
          <View style={styles.sectionHeader}>
            <BarChart color="#FFFFFF" size={20} />
            <Text style={styles.sectionHeaderTitle}>Statistiques</Text>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Users color="#0A1F44" size={24} />
              <Text style={styles.statValue}>{stats.totalClients}</Text>
              <Text style={styles.statLabel}>Clients</Text>
            </View>

            <View style={styles.statCard}>
              <Wrench color="#0A1F44" size={24} />
              <Text style={styles.statValue}>{stats.totalMechanics}</Text>
              <Text style={styles.statLabel}>Mécaniciens</Text>
            </View>

            <View style={styles.statCard}>
              <ClipboardList color="#0A1F44" size={24} />
              <Text style={styles.statValue}>{stats.totalServices}</Text>
              <Text style={styles.statLabel}>Interventions</Text>
            </View>

            <View style={styles.statCard}>
              <AlertCircle color="#0A1F44" size={20} />
              <Text style={styles.statValue}>{stats.totalReports}</Text>
              <Text style={styles.statLabel}>Signalements</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Services récents</Text>
          {recentServices.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>Aucun service récent</Text>
            </View>
          ) : (
            recentServices.map((service) => (
              <View
                key={service.id}
                style={[styles.serviceCard, { backgroundColor: theme.cardBackground }]}
              >
                <View style={styles.serviceHeader}>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          service.status === 'completed'
                            ? '#E5F5E5'
                            : service.status === 'cancelled'
                              ? '#FFE5E5'
                              : '#E5F0FF',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            service.status === 'completed'
                              ? '#34C759'
                              : service.status === 'cancelled'
                                ? '#FF3B30'
                                : '#007AFF',
                        },
                      ]}
                    >
                      {service.status === 'completed'
                        ? 'Terminé'
                        : service.status === 'cancelled'
                          ? 'Annulé'
                          : service.status === 'in_progress'
                            ? 'En cours'
                            : service.status === 'accepted'
                              ? 'Accepté'
                              : 'En attente'}
                    </Text>
                  </View>
                  <Text style={[styles.serviceType, { color: theme.textPrimary }]}> 
                    {service.service_type}
                  </Text>
                </View>
                <Text style={[styles.serviceDescription, { color: theme.textSecondary }]}>
                  {service.description}
                </Text>
                <Text style={[styles.serviceDate, { color: theme.textSecondary }]}>
                  {new Date(service.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
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
    position: 'relative',
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
    gap: 2,
  },
  adminBadgeIcon: {
    marginRight: 8,
  },
  headerTextGroup: {
    alignItems: 'center',
  },
  logo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF9500',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  welcomeCard: {
    backgroundColor: '#0A1F44',
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  welcomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  welcomeBadgeIcon: {
    marginRight: 4,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 0,
    marginBottom: 0,
    marginTop: 12,
    gap: 12,
    justifyContent: 'space-between',
  },
  statCard: {
    width: '42%',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 6,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#B3C8FF',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0A1F44',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#0A1F44',
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statsCardContainer: {
    backgroundColor: '#0A1F44',
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  serviceCard: {
    backgroundColor: '#D9E8FF',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  serviceType: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    color: '#0A1F44',
  },
  serviceDescription: {
    fontSize: 14,
    marginBottom: 8,
    color: '#0A1F44',
  },
  serviceDate: {
    fontSize: 12,
    color: '#0A1F44',
  },
  emptyState: {
    padding: 24,
    marginHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#D9E8FF',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#0A1F44',
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    zIndex: 5,
  },
  menuContainer: {
    position: 'absolute',
    top: 116,
    left: 16,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 12,
    gap: 10,
    zIndex: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  menuItem: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F1F4FA',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0A1F44',
  },
  menuItemDanger: {
    backgroundColor: '#0A1F44',
  },
  menuItemDangerLabel: {
    color: '#FFFFFF',
  },
});

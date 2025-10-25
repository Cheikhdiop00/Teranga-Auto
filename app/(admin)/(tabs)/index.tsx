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
  MessageCircle,
  Crown,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getCollection, api } from '@/lib/supabase';
import { API_BASE_URL } from '@/config/api';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AdminDashboardScreen() {
  const { profile, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalClients: 0,
    totalMechanics: 0,
    totalServices: 0,
    totalReports: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentServices, setRecentServices] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
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
        headerBackground: '#0A1F44', // Bleu foncé pour le header
        borderColor: '#2C2C2E',
        textPrimary: '#FFFFFF',
        textSecondary: '#A0A0A0',
        cardBackground: '#1F1F1F',
        menuBackground: '#2C2C2E',
        iconColor: '#FFFFFF',
        headerTextColor: '#FFFFFF',
        headerIconColor: '#FFFFFF',
      }
    : {
        background: '#F5F5F5',
        headerBackground: '#0A1F44', // Bleu foncé pour le header
        borderColor: '#E0E0E0',
        textPrimary: '#000000',
        textSecondary: '#666666',
        cardBackground: '#FFFFFF',
        menuBackground: '#FFFFFF',
        iconColor: '#000000',
        headerTextColor: '#FFFFFF', // Texte blanc sur fond bleu
        headerIconColor: '#FFFFFF', // Icônes blanches sur fond bleu
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
      await AsyncStorage.removeItem('authToken');
      signOut();
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
    if (!authLoading && profile) {
      loadStats();
      loadUsers();
    }
  }, [authLoading, profile]);

  const loadStats = async () => {
    try {
      console.log('Loading stats for admin dashboard...');
      const res = await api.admin.stats();
      // res: { totalUsers, totalClients, totalMechanics, activeUsers }
      setStats({
        totalClients: res.totalClients ?? 0,
        totalMechanics: res.totalMechanics ?? 0,
        totalServices: res.totalServices ?? 0,
        totalReports: res.totalReports ?? 0,
      });

      // Charger les 3 derniers services depuis l'API backend
      try {
        const token = await AsyncStorage.getItem('authToken');
        const r = await fetch(`${API_BASE_URL}/services`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            action: 'find',
            query: {},
            sort: { createdAt: -1 },
            limit: 3,
          }),
        });
        if (r.ok) {
          const json = await r.json();
          const list = Array.isArray(json.data) ? json.data : [];
          setRecentServices(list.slice(0, 3));
        } else {
          setRecentServices([]);
        }
      } catch {
        setRecentServices([]);
      }
      console.log('Stats loaded successfully');
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await api.admin.users();
      const list = (res.users || res.data || []) as any[];
      setUsers(Array.isArray(list) ? list : []);
    } catch (e) {
      setUsers([]);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.headerBackground, borderBottomColor: theme.borderColor }]}>
        <TouchableOpacity onPress={() => setIsMenuOpen(true)} style={styles.menuButton}>
          <Menu size={24} color={theme.headerIconColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.headerTextColor }]}>Teranga Auto</Text>
        <View style={styles.headerIcons}>
          <Bell size={24} color={theme.headerIconColor} />
        </View>
      </View>

      {/* Bandeau Rôle Administrateur */}
      <View style={[styles.roleBanner, { backgroundColor: theme.cardBackground, borderBottomColor: theme.borderColor }]}>
        <View style={styles.roleContent}>
          <Crown size={20} color="#FFD700" style={styles.crownIcon} />
          <Text style={[styles.roleTitle, { color: theme.textPrimary }]}>Administrateur</Text>
          <View style={styles.adminBadge}>
            <ShieldCheck size={14} color="#FFFFFF" />
            <Text style={styles.badgeText}>ADMIN</Text>
          </View>
        </View>
      </View>

      {/* Menu Drawer */}
      {isMenuOpen && (
        <TouchableWithoutFeedback onPress={() => setIsMenuOpen(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.drawer,
                  { backgroundColor: theme.menuBackground, transform: [{ translateX: menuTranslate }], width: drawerWidth },
                ]}
              >
                <View style={styles.drawerHeader}>
                  <Text style={[styles.drawerTitle, { color: theme.textPrimary }]}>Menu Admin</Text>
                </View>
                <TouchableOpacity style={styles.drawerItem} onPress={handleToggleTheme}>
                  <Moon size={20} color={theme.iconColor} />
                  <Text style={[styles.drawerItemText, { color: theme.textPrimary }]}>
                    {isDarkMode ? 'Mode clair' : 'Mode sombre'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.drawerItem} onPress={handleOpenDocs}>
                  <Info size={20} color={theme.iconColor} />
                  <Text style={[styles.drawerItemText, { color: theme.textPrimary }]}>Documentation</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.drawerItem} onPress={handleViewHistory}>
                  <Clock size={20} color={theme.iconColor} />
                  <Text style={[styles.drawerItemText, { color: theme.textPrimary }]}>Historique</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.drawerItem} onPress={handleSignOut}>
                  <LogOut size={20} color="#FF3B30" />
                  <Text style={[styles.drawerItemText, { color: '#FF3B30' }]}>Déconnexion</Text>
                </TouchableOpacity>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadStats} />}
      >
        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: theme.cardBackground, borderColor: theme.borderColor }]}>
            <Users size={32} color="#007AFF" />
            <Text style={[styles.statValue, { color: theme.textPrimary }]}>{stats.totalClients}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Clients</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.cardBackground, borderColor: theme.borderColor }]}>
            <Wrench size={32} color="#34C759" />
            <Text style={[styles.statValue, { color: theme.textPrimary }]}>{stats.totalMechanics}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Mécaniciens</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.cardBackground, borderColor: theme.borderColor }]}>
            <ClipboardList size={32} color="#FF9500" />
            <Text style={[styles.statValue, { color: theme.textPrimary }]}>{stats.totalServices}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Services</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.cardBackground, borderColor: theme.borderColor }]}>
            <AlertCircle size={32} color="#FF3B30" />
            <Text style={[styles.statValue, { color: theme.textPrimary }]}>{stats.totalReports}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Signalements</Text>
          </View>
        </View>

        {/* Utilisateurs inscrits */}
        <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Utilisateurs inscrits ({users.length})</Text>
          {users.length > 0 ? (
            users.map((u: any, index: number) => (
              <View key={u._id || u.id || index} style={[styles.userRow, { borderBottomColor: theme.borderColor }]}> 
                <View style={{ flex: 1 }}>
                  <Text style={[styles.userName, { color: theme.textPrimary }]}>
                    {`${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Utilisateur'}
                  </Text>
                  <Text style={[styles.userMeta, { color: theme.textSecondary }]}>
                    {(u.role === 'ADMIN' ? 'Admin' : u.role === 'MECANICIEN' ? 'Mécanicien' : 'Client')} • {u.phoneNumber || '—'}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyMessage, { color: theme.textSecondary }]}>Aucun utilisateur pour le moment</Text>
          )}
        </View>

        {/* Recent Services */}
        <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Services Récents</Text>
          {recentServices.length > 0 ? (
            recentServices.slice(0, 3).map((service: any, index: number) => (
              <View key={service._id || service.id || index} style={[styles.serviceItem, { borderBottomColor: theme.borderColor }]}> 
                <Text style={[styles.serviceName, { color: theme.textPrimary }]}>{service.name || 'Service'}</Text>
                <Text style={[styles.serviceDate, { color: theme.textSecondary }]}>{formatDate(service.createdAt || service.created_at)}</Text>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyMessage, { color: theme.textSecondary }]}> 
              Aucun service récent pour le moment
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Bouton flottant pour la messagerie */}
      <TouchableOpacity
        style={[styles.floatingButton, { backgroundColor: '#0A1F44' }]}
        onPress={() => router.push('/(admin)/messages' as any)}
        activeOpacity={0.8}
      >
        <MessageCircle size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  menuButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerIcons: {
    padding: 8,
  },
  roleBanner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  roleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crownIcon: {
    marginRight: 8,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A1F44',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 10,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    paddingTop: 60,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  drawerHeader: {
    marginBottom: 24,
  },
  drawerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  drawerItemText: {
    fontSize: 16,
  },
  scrollContent: {
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 14,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  serviceItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '500',
  },
  serviceDate: {
    fontSize: 14,
    marginTop: 4,
  },
  emptyMessage: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userMeta: {
    fontSize: 12,
    marginTop: 2,
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
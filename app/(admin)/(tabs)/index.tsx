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
  Modal,
  TextInput,
  Alert,
  Image,
  DeviceEventEmitter,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import {
  AlertCircle,
  Bell,
  ClipboardList,
  Clock,
  Eye,
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
  Edit,
  Trash2,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getCollection, api } from '@/lib/supabase';
import { API_BASE_URL } from '@/config/api';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/config/api';
import { io, Socket } from 'socket.io-client';

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
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(3); // Exemple: 3 notifications non lues
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    role: '',
  });

  // Ads slider (API-backed with fallback)
  type AdCard = {
    id: string;
    title: string;
    subtitle?: string;
    imageUrl?: string;
    targetUrl?: string;
    color: [string, string];
    cta?: string;
  };
  const [ads, setAds] = useState<AdCard[]>([
    {
      id: 'local-1',
      title: 'Découvrez la plus grande annonce',
      subtitle: 'Nouvelles fonctionnalités disponibles',
      cta: 'Découvrir',
      color: ['#9AE6B4', '#68D391'],
    },
    {
      id: 'local-2',
      title: 'Promo Abonnements',
      subtitle: 'Jusqu\'à -30% ce mois-ci',
      cta: 'Installer',
      color: ['#90CDF4', '#63B3ED'],
    },
    {
      id: 'local-3',
      title: 'Statistiques en temps réel',
      subtitle: 'Analyse instantanée',
      cta: 'Voir',
      color: ['#FBB6CE', '#F687B3'],
    },
  ]);
  const adScrollRef = useRef<ScrollView | null>(null);
  const [adIndex, setAdIndex] = useState(0);

  const menuProgress = useRef(new Animated.Value(0)).current;
  const drawerWidth = Math.min(Dimensions.get('window').width * 0.6, 240);
  const menuTranslate = menuProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-drawerWidth, 0],
  });

  const theme = isDarkMode
    ? {
        // Mode sombre
        backgroundGradient: ['#1a1a2e', '#16213e'] as const,
        headerBackground: '#0A1F44',
        borderColor: '#2C2C2E',
        textPrimary: '#FFFFFF',
        textSecondary: '#B0B0B0',
        cardBackground: '#1F1F1F',
        menuBackground: '#0A1F44', // Bleu foncé pour le menu en mode sombre
        menuTextColor: '#FFFFFF',  // Texte blanc pour le menu
        iconColor: '#FFFFFF',
        headerTextColor: '#FFFFFF',
        headerIconColor: '#FFFFFF',
        gradient: ['#667eea', '#764ba2'] as const,
        accent: '#FFD700',
      }
    : {
        // Mode clair
        backgroundGradient: ['#f5f7fa', '#c3cfe2'] as const,
        headerBackground: '#0A1F44',
        borderColor: '#E0E0E0',
        textPrimary: '#000000',
        textSecondary: '#666666',
        cardBackground: '#FFFFFF',
        menuBackground: '#0A1F44', // Bleu foncé pour le menu en mode clair
        menuTextColor: '#FFFFFF',  // Texte blanc pour le menu
        iconColor: '#FFFFFF',      // Icônes blanches
        headerTextColor: '#FFFFFF',
        headerIconColor: '#FFFFFF',
        gradient: ['#667eea', '#764ba2'] as const,
        accent: '#FFD700',
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

  // Auto-scroll ads every 4 seconds
  useEffect(() => {
    if (!ads.length) return;
    const interval = setInterval(() => {
      const next = (adIndex + 1) % ads.length;
      setAdIndex(next);
      const width = Dimensions.get('window').width;
      adScrollRef.current?.scrollTo({ x: next * (width - 32), animated: true });
    }, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adIndex]);

  // Load ads from API (active only) and listen for updates
  useEffect(() => {
    const reloadAds = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        const headers: any = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(`${API_BASE_URL}/ads`, { headers });
        if (!res.ok) return;
        const payload = await res.json();
        const list = Array.isArray(payload.data) ? payload.data : [];
        const mapped: AdCard[] = list.map((a: any, i: number) => ({
          id: a._id || String(i),
          title: a.title || 'Publicité',
          subtitle: a.description || '',
          imageUrl: a.imageUrl || undefined,
          targetUrl: a.targetUrl || undefined,
          color: (i % 3 === 0)
            ? ['#9AE6B4', '#68D391']
            : (i % 3 === 1)
            ? ['#90CDF4', '#63B3ED']
            : ['#FBB6CE', '#F687B3'],
          cta: 'Voir',
        }));
        if (mapped.length) setAds(mapped);
      } catch {}
    };
    reloadAds();
    const sub = DeviceEventEmitter.addListener('ads:updated', reloadAds);
    // Socket listener for cross-device updates
    let socket: Socket | null = null;
    (async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        socket = io(API_URL, { auth: { token } });
        socket.on('ads_updated', reloadAds);
      } catch {}
    })();
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!authLoading && profile) {
      Promise.all([loadStats(), loadUsers()]).catch(console.error);
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
      setAllUsers(list);
      const sorted = Array.isArray(list) ? list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];
      setUsers(sorted.slice(0, 3));
    } catch (e) {
      setUsers([]);
      setAllUsers([]);
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

  const saveUser = async () => {
    if (!selectedUser) return;
    try {
      await fetch(`${process.env.EXPO_PUBLIC_API_URL || API_URL}/api/admin/users/${selectedUser._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await AsyncStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          phoneNumber: editForm.phoneNumber,
          email: editForm.email,
          role: editForm.role,
        }),
      });
      Alert.alert('Succès', 'Utilisateur modifié avec succès');
      setModalVisible(false);
      loadUsers();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier l\'utilisateur');
    }
  };

  const openEditModal = (user: any) => {
    setSelectedUser(user);
    setEditForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phoneNumber: user.phoneNumber || '',
      email: user.email || '',
      role: user.role,
    });
    setModalVisible(true);
  };

  const deleteUser = async (userId: string) => {
    Alert.alert(
      'Confirmer la suppression',
      'Êtes-vous sûr de vouloir supprimer cet utilisateur ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await fetch(`${process.env.EXPO_PUBLIC_API_URL || API_URL}/api/admin/users/${userId}`, {
                  method: 'DELETE',
                  headers: {
                    Authorization: `Bearer ${await AsyncStorage.getItem('authToken')}`,
                  },
                });
                Alert.alert('Succès', 'Utilisateur supprimé');
                loadUsers();
              } catch (error) {
                Alert.alert('Erreur', 'Impossible de supprimer l\'utilisateur');
              }
            })();
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.headerBackground, borderBottomColor: theme.borderColor }]}>
          <TouchableOpacity onPress={() => setIsMenuOpen(true)} style={styles.menuButton}>
            <Menu size={24} color={theme.headerIconColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.headerTextColor }]}>Teranga Auto</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity 
              onPress={() => router.push('/(admin)/(tabs)/notifications' as any)}
              style={styles.notificationButton}
            >
              <Bell size={24} color={theme.headerIconColor} />
              {unreadNotifications > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationText}>
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
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
                  { 
                    backgroundColor: theme.menuBackground, 
                    transform: [{ translateX: menuTranslate }], 
                    width: drawerWidth 
                  },
                ]}
              >
                <View style={styles.drawerHeader}>
                  <Text style={[styles.drawerTitle, { color: theme.menuTextColor }]}>Menu Admin</Text>
                </View>
                <TouchableOpacity style={styles.drawerItem} onPress={handleToggleTheme}>
                  <Moon size={20} color={theme.menuTextColor} />
                  <Text style={[styles.drawerItemText, { color: theme.menuTextColor }]}>
                    {isDarkMode ? 'Mode clair' : 'Mode sombre'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.drawerItem} onPress={handleOpenDocs}>
                  <Info size={20} color={theme.menuTextColor} />
                  <Text style={[styles.drawerItemText, { color: theme.menuTextColor }]}>Documentation</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.drawerItem} onPress={() => {
                  setIsMenuOpen(false);
                  router.push('/(admin)/ads' as any);
                }}>
                  <Eye size={20} color={theme.menuTextColor} />
                  <Text style={[styles.drawerItemText, { color: theme.menuTextColor }]}>Publicités</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.drawerItem} onPress={handleViewHistory}>
                  <Clock size={20} color={theme.menuTextColor} />
                  <Text style={[styles.drawerItemText, { color: theme.menuTextColor }]}>Historique</Text>
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
        style={{ marginTop: Dimensions.get('window').height * 0.12 }}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadStats} />}
      >
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
        {/* Titre Statistiques des utilisateurs */}
        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          <Text style={styles.statsTitle}>Statistiques des utilisateurs</Text>
        </View>
        {/* Quick Action Cards - 4 per row (icon + label with counts) */}
        <View style={[styles.quickGrid, { marginTop: 6, marginBottom: 16 }]}> 
          <TouchableOpacity style={styles.statCard} activeOpacity={0.85}>
            <View style={styles.statIconBox}><Users size={22} color="#007AFF" /></View>
            <Text style={styles.statLabelBlue}>{`Tous (${Number((stats as any)?.totalUsers ?? (allUsers?.length ?? 0))})`}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statCard} activeOpacity={0.85}>
            <View style={styles.statIconBox}><Users size={22} color="#007AFF" /></View>
            <Text style={styles.statLabelBlue}>{`Clients (${Number((stats as any)?.totalClients ?? (allUsers?.filter?.((u:any)=>u.role==='CLIENT')?.length ?? 0))})`}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statCard} activeOpacity={0.85}>
            <View style={styles.statIconBox}><Wrench size={22} color="#007AFF" /></View>
            <Text style={styles.statLabelBlue}>{`Mécanos (${Number((stats as any)?.totalMechanics ?? (allUsers?.filter?.((u:any)=>u.role==='MECANICIEN')?.length ?? 0))})`}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statCard} activeOpacity={0.85}>
            <View style={styles.statIconBox}><ShieldCheck size={22} color="#007AFF" /></View>
            <Text style={styles.statLabelBlue}>{`Admins (${Number((stats as any)?.totalAdmins ?? (allUsers?.filter?.((u:any)=>u.role==='ADMIN')?.length ?? 0))})`}</Text>
          </TouchableOpacity>
        </View>
        {/* Titre Publicité */}
        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          <Text style={styles.publiciteTitle}>Publicité</Text>
        </View>
        {/* Slider Publicitaire */}
        <ScrollView
          ref={(ref) => { adScrollRef.current = ref; }}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 12 }}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          onScroll={(e) => {
            const w = Dimensions.get('window').width - 32;
            const idx = Math.round(e.nativeEvent.contentOffset.x / w);
            if (idx !== adIndex) setAdIndex(idx);
          }}
          scrollEventThrottle={16}
        >
          {ads.map((ad) => {
            const cardWidth = Dimensions.get('window').width - 32;
            if (ad.imageUrl) {
              return (
                <View key={ad.id} style={[styles.adCard, { width: cardWidth }]}> 
                  <Image source={{ uri: ad.imageUrl }} style={styles.adImageBg} resizeMode="cover" />
                  <LinearGradient colors={["rgba(0,0,0,0.5)", "rgba(0,0,0,0.3)"]} style={styles.adOverlay} />
                  <View style={styles.adContent}>
                    <Text style={[styles.adTitle, { color: '#FFFFFF' }]} numberOfLines={2}>{ad.title}</Text>
                    {!!ad.subtitle && (
                      <Text style={[styles.adSubtitle, { color: '#FFFFFF' }]} numberOfLines={2}>{ad.subtitle}</Text>
                    )}
                    <View style={{ flexDirection: 'row', marginTop: 8, alignItems: 'center', gap: 8 }}>
                      <TouchableOpacity
                        style={styles.adButton}
                        activeOpacity={0.8}
                        onPress={() => {
                          if (ad.targetUrl) Linking.openURL(ad.targetUrl).catch(() => {});
                        }}
                      >
                        <Text style={styles.adButtonText}>{ad.cta || 'Voir'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            }
            return (
              <View key={ad.id} style={[styles.adCard, { width: cardWidth }]}> 
                <LinearGradient colors={ad.color as [string, string]} style={styles.adGradient}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.adTitle} numberOfLines={2}>{ad.title}</Text>
                    {!!ad.subtitle && (
                      <Text style={styles.adSubtitle} numberOfLines={2}>{ad.subtitle}</Text>
                    )}
                    <View style={{ flexDirection: 'row', marginTop: 8, alignItems: 'center', gap: 8 }}>
                      <TouchableOpacity
                        style={styles.adButton}
                        activeOpacity={0.8}
                        onPress={() => {
                          if (ad.targetUrl) Linking.openURL(ad.targetUrl).catch(() => {});
                        }}
                      >
                        <Text style={styles.adButtonText}>{ad.cta || 'Voir'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            );
          })}
        </ScrollView>
        <View style={styles.adDots}>
          {ads.map((_, i) => (
            <View key={i} style={[styles.adDot, i === adIndex ? styles.adDotActive : null]} />
          ))}
        </View>
        

        {/* Utilisateurs inscrits */}
        <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Utilisateurs récents (3 derniers)</Text>
          {users.length > 0 ? (
            users.map((u: any) => (
              <Swipeable
                key={u._id}
                renderRightActions={() => (
                  <View style={styles.swipeActions}>
                    <TouchableOpacity style={[styles.swipeBtn, { backgroundColor: '#007AFF' }]} onPress={() => openEditModal(u)}>
                      <Edit size={18} color="#f7f7f7ff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.swipeBtn, { backgroundColor: '#FF3B30' }]} onPress={() => deleteUser(u._id)}>
                      <Trash2 size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                )}
              >
                <View style={[styles.userRow, { borderBottomColor: theme.borderColor }]}>
                  <TouchableOpacity onPress={() => openEditModal(u)} style={styles.userAvatarMini}>
                    <Text style={styles.userAvatarMiniText}>
                      {(u.firstName || 'U').charAt(0)}{(u.lastName || '').charAt(0)}
                    </Text>
                  </TouchableOpacity>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.userName, { color: theme.textPrimary }]}>
                      {`${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Utilisateur'}
                    </Text>
                    <Text style={[styles.userMeta, { color: theme.textSecondary }]}>
                      {(u.role === 'ADMIN' ? 'Admin' : u.role === 'MECANICIEN' ? 'Mécanicien' : 'Client')} • {u.phoneNumber || '—'}
                    </Text>
                  </View>
                </View>
              </Swipeable>
            ))
          ) : (
            <Text style={[styles.emptyMessage, { color: theme.textSecondary }]}>Aucun utilisateur pour le moment</Text>
          )}
        </View>

        {/* Recent Services */}
        <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.borderColor, marginTop: '1%' }]}>
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

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Modifier l'utilisateur</Text>

            <TextInput
              style={[styles.input, { borderColor: theme.borderColor, color: theme.textPrimary }]}
              placeholder="Prénom"
              placeholderTextColor={theme.textSecondary}
              value={editForm.firstName}
              onChangeText={(text) => setEditForm({ ...editForm, firstName: text })}
            />

            <TextInput
              style={[styles.input, { borderColor: theme.borderColor, color: theme.textPrimary }]}
              placeholder="Nom"
              placeholderTextColor={theme.textSecondary}
              value={editForm.lastName}
              onChangeText={(text) => setEditForm({ ...editForm, lastName: text })}
            />

            <TextInput
              style={[styles.input, { borderColor: theme.borderColor, color: theme.textPrimary }]}
              placeholder="Téléphone"
              placeholderTextColor={theme.textSecondary}
              value={editForm.phoneNumber}
              onChangeText={(text) => setEditForm({ ...editForm, phoneNumber: text })}
            />

            <TextInput
              style={[styles.input, { borderColor: theme.borderColor, color: theme.textPrimary }]}
              placeholder="Email"
              placeholderTextColor={theme.textSecondary}
              value={editForm.email}
              onChangeText={(text) => setEditForm({ ...editForm, email: text })}
            />

            <TextInput
              style={[styles.input, { borderColor: theme.borderColor, color: theme.textPrimary }]}
              placeholder="Rôle (CLIENT, MECANICIEN, ADMIN)"
              placeholderTextColor={theme.textSecondary}
              value={editForm.role}
              onChangeText={(text) => setEditForm({ ...editForm, role: text })}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={[styles.cancelButton, { backgroundColor: theme.cardBackground, borderColor: theme.borderColor }]}
              >
                <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveUser} style={styles.saveButton}>
                <Text style={styles.saveButtonText}>Sauvegarder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bouton flottant pour la messagerie */}
      <TouchableOpacity
        style={[styles.floatingButton, { backgroundColor: '#0A1F44' }]}
        onPress={() => router.push('/(admin)/messages' as any)}
        activeOpacity={0.8}
      >
        <MessageCircle size={28} color="#ffffffff" />
      </TouchableOpacity>
    </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffffff',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    zIndex: 1,
  },
  menuButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    color: '#633636ff',
  },
  headerIcons: {
    position: 'relative',
    padding: 8,
  },
  notificationButton: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  roleBanner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    marginHorizontal: -16,
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
    color: '#ffffffff',
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
    paddingTop: Dimensions.get('window').height * 0.12 + 60,
    paddingHorizontal: 16,
    shadowColor: '#ffffffff',
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
    flexWrap: 'wrap'  ,
    justifyContent: 'space-between',
    rowGap: 12,
    columnGap: 12,
    marginBottom: 24,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'space-between',
    rowGap: 4,
    columnGap: 2,
    paddingHorizontal: 0,
  },
  statsRow: {
    paddingHorizontal: 16,
    paddingRight: 24,
    gap: 12,
  },
  statCard: {
    flexBasis: '24%',
    flexGrow: 0,
    aspectRatio: 1,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0cf045ff',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowColor: '#08147eff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statIconBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ffffffff',
    borderWidth: 1,
    borderColor: '#ffffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0A1F44',
    letterSpacing: 0.3,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statValueBlue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#06396effff',
  },
  statLabel: {
    fontSize: 12,  
    opacity: 0.9,
  },
  statLabelBlue: {
    fontSize: 11,
    color: '#181bc9ff',
    fontWeight: '600',
    opacity: 0.9,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#a3a6b1ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  markerContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 5,
    borderRadius: 5,
    alignItems: 'center',
    minWidth: 100,
  },
  markerText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  markerSubtext: {
    color: 'white',
    fontSize: 10,
    textAlign: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    padding: 20,
    borderRadius: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  mapContainer: {
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  // Ads slider styles
  adCard: {
    height: 135,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 12,
  },
  publiciteTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#0A1F44',
  },
  adImageBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  adOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)'
  },
  adContent: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 14,
  },
  adGradient: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginLeft: 12,
  },
  adTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0A1F44',
    marginBottom: 4,
  },
  adSubtitle: {
    fontSize: 14,
    color: '#0A1F44',
    opacity: 0.9,
  },
  adButton: {
    backgroundColor: '#0A1F44',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  adButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  adDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  adDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffffff',
  },
  adDotActive: {
    backgroundColor: '#0A1F44',
    width: 16,
  },
  // Swipeable user row styles
  swipeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
    gap: 8,
  },
  swipeBtn: {
    width: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginHorizontal: 4,
  },
  userAvatarMini: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0A1F44',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarMiniText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
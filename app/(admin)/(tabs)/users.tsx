import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { api } from '@/lib/supabase';
import { Profile } from '@/types/database';
import { Search, Ban, CheckCircle } from 'lucide-react-native';

export default function UsersScreen() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'client' | 'mechanic'>('all');

  useEffect(() => {
    loadUsers();
  }, [filter]);

  const loadUsers = async () => {
    try {
      const res = await api.admin.users();
      const all = (res.users || []) as any[];
      const filtered = all.filter((u) => {
        if (filter === 'all') return u.role !== 'ADMIN';
        return filter === 'client' ? u.role === 'CLIENT' : u.role === 'MECANICIEN';
      });
      const mapped: Profile[] = filtered.map((u: any) => ({
        id: u._id || u.id,
        user_type: u.role === 'CLIENT' ? 'client' : 'mechanic',
        first_name: u.firstName || '',
        last_name: u.lastName || '',
        phone: u.phoneNumber || '',
        address: '',
        photo_url: u.profilePhoto,
        id_card_number: undefined,
        specialties: undefined,
        is_available: true,
        rating_average: 0,
        rating_count: 0,
        latitude: 0,
        longitude: 0,
        is_blocked: u.status === 'inactive',
        created_at: u.createdAt || new Date().toISOString(),
        updated_at: u.updatedAt || new Date().toISOString(),
      }));
      setUsers(mapped);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBlockUser = async (userId: string, isBlocked: boolean) => {
    try {
      const newStatus = isBlocked ? 'active' : 'inactive';
      await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.49:3000'}/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await (await import('@react-native-async-storage/async-storage')).default.getItem('authToken')}`
        },
        body: JSON.stringify({ status: newStatus }),
      });

      Alert.alert(
        'Succès',
        `Utilisateur ${!isBlocked ? 'bloqué' : 'débloqué'} avec succès`
      );
      loadUsers();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier le statut');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Utilisateurs</Text>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === 'all' && styles.filterButtonTextActive,
            ]}
          >
            Tous
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'client' && styles.filterButtonActive,
          ]}
          onPress={() => setFilter('client')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === 'client' && styles.filterButtonTextActive,
            ]}
          >
            Clients
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'mechanic' && styles.filterButtonActive,
          ]}
          onPress={() => setFilter('mechanic')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === 'mechanic' && styles.filterButtonTextActive,
            ]}
          >
            Mécaniciens
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadUsers} />
        }
      >
        {users.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Aucun utilisateur trouvé</Text>
          </View>
        ) : (
          users.map((user) => (
            <View key={user.id} style={styles.userCard}>
              <View style={styles.userHeader}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>
                    {user.first_name[0]}
                    {user.last_name[0]}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>
                    {user.first_name} {user.last_name}
                  </Text>
                  <Text style={styles.userType}>
                    {user.user_type === 'client' ? 'Client' : 'Mécanicien'}
                  </Text>
                  <Text style={styles.userPhone}>{user.phone}</Text>
                  {user.user_type === 'mechanic' && (
                    <Text style={styles.userRating}>
                      ⭐ {user.rating_average.toFixed(1)} ({user.rating_count}{' '}
                      avis)
                    </Text>
                  )}
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    user.is_blocked
                      ? styles.statusBadgeBlocked
                      : styles.statusBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      user.is_blocked
                        ? styles.statusTextBlocked
                        : styles.statusTextActive,
                    ]}
                  >
                    {user.is_blocked ? 'Bloqué' : 'Actif'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  user.is_blocked
                    ? styles.unblockButton
                    : styles.blockButton,
                ]}
                onPress={() => toggleBlockUser(user.id, user.is_blocked)}
              >
                {user.is_blocked ? (
                  <CheckCircle color="#34C759" size={20} />
                ) : (
                  <Ban color="#FF3B30" size={20} />
                )}
                <Text
                  style={[
                    styles.actionButtonText,
                    user.is_blocked
                      ? styles.unblockButtonText
                      : styles.blockButtonText,
                  ]}
                >
                  {user.is_blocked ? 'Débloquer' : 'Bloquer'}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}
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
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#0A1F44',
    borderBottomWidth: 1,
    borderBottomColor: '#0A1F44',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D1D6',
  },
  filterButtonActive: {
    backgroundColor: '#0A1F44',
    borderColor: '#0A1F44',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0A1F44',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D1D6',
  },
  userHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0A1F44',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#0A1F44',
  },
  userType: {
    fontSize: 12,
    color: '#0A1F44',
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 12,
    color: '#0A1F44',
    marginBottom: 2,
  },
  userRating: {
    fontSize: 12,
    fontWeight: '500',
    color: '#0A1F44',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusBadgeActive: {
    backgroundColor: '#E5F5E5',
  },
  statusBadgeBlocked: {
    backgroundColor: '#FFE5E5',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusTextActive: {
    color: '#34C759',
  },
  statusTextBlocked: {
    color: '#FF3B30',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  blockButton: {
    backgroundColor: '#FFE5E5',
  },
  unblockButton: {
    backgroundColor: '#E5F5E5',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  blockButtonText: {
    color: '#FF3B30',
  },
  unblockButtonText: {
    color: '#34C759',
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

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { api } from '@/lib/supabase';
import { API_BASE_URL } from '@/config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Profile } from '@/types/database';
import { Search, Ban, CheckCircle } from 'lucide-react-native';

export default function UsersScreen() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'client' | 'mechanic' | 'admin'>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    role: '',
  });
  const isEditing = !!selectedUser;

  useEffect(() => {
    loadUsers();
  }, [filter]);

  const loadUsers = async () => {
    try {
      const res = await api.admin.users();
      const all = (res.users || []) as any[];
      const filtered = all.filter((u) => {
        if (filter === 'all') return true;
        if (filter === 'admin') return u.role === 'ADMIN';
        return filter === 'client' ? u.role === 'CLIENT' : u.role === 'MECANICIEN';
      });
      const mapped: Profile[] = filtered.map((u: any) => ({
        id: u._id || u.id,
        user_type: u.role === 'CLIENT' ? 'client' : u.role === 'ADMIN' ? 'admin' : 'mechanic',
        first_name: u.firstName || '',
        last_name: u.lastName || '',
        phone: u.phoneNumber || '',
        email: u.email || '',
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

  const openEditModal = (user: Profile) => {
    setSelectedUser(user);
    setEditForm({
      firstName: user.first_name,
      lastName: user.last_name,
      phoneNumber: user.phone,
      email: user.email || '',
      role: user.user_type === 'client' ? 'CLIENT' : user.user_type === 'admin' ? 'ADMIN' : 'MECANICIEN',
    });
    setModalVisible(true);
  };

  const openCreateModal = () => {
    setSelectedUser(null);
    setEditForm({ firstName: '', lastName: '', phoneNumber: '', email: '', role: 'CLIENT' });
    setModalVisible(true);
  };

  const saveUser = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      if (isEditing && selectedUser) {
        await fetch(`${API_BASE_URL}/admin/users/${selectedUser.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            firstName: editForm.firstName,
            lastName: editForm.lastName,
            phoneNumber: editForm.phoneNumber,
            email: editForm.email,
            role: editForm.role,
          }),
        });
        Alert.alert('Succès', 'Utilisateur modifié avec succès');
      } else {
        await fetch(`${API_BASE_URL}/admin/users`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            firstName: editForm.firstName,
            lastName: editForm.lastName,
            phoneNumber: editForm.phoneNumber,
            email: editForm.email,
            role: editForm.role || 'CLIENT',
            status: 'active',
          }),
        });
        Alert.alert('Succès', 'Utilisateur créé avec succès');
      }

      setModalVisible(false);
      loadUsers();
    } catch (error) {
      Alert.alert('Erreur', `Impossible de ${isEditing ? 'modifier' : 'créer'} l'utilisateur`);
    }
  };

  const toggleBlockUser = async (userId: string, isBlocked: boolean) => {
    try {
      const newStatus = isBlocked ? 'active' : 'inactive';
      const token = await AsyncStorage.getItem('authToken');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
        method: 'PATCH',
        headers,
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

  const deleteUser = async (user: Profile) => {
    if (user.user_type === 'admin') {
      Alert.alert('Action interdite', "Vous ne pouvez pas supprimer un administrateur.");
      return;
    }
    Alert.alert(
      'Supprimer',
      `Supprimer ${user.first_name} ${user.last_name} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('authToken');
              const headers: any = {};
              if (token) headers.Authorization = `Bearer ${token}`;
              await fetch(`${API_BASE_URL}/admin/users/${user.id}`, {
                method: 'DELETE',
                headers,
              });
              Alert.alert('Succès', 'Utilisateur supprimé');
              loadUsers();
            } catch (e) {
              Alert.alert('Erreur', "Impossible de supprimer l'utilisateur");
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Utilisateurs</Text>
        <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
          <Text style={styles.addButtonText}>Ajouter</Text>
        </TouchableOpacity>
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
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'admin' && styles.filterButtonActive,
          ]}
          onPress={() => setFilter('admin')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === 'admin' && styles.filterButtonTextActive,
            ]}
          >
            Admins
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
            <TouchableOpacity key={user.id} style={styles.userCard} onPress={() => openEditModal(user)}>
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
                    {user.user_type === 'client' ? 'Client' : user.user_type === 'admin' ? 'Administrateur' : 'Mécanicien'}
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
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#FFECEC', marginTop: 8 }]}
                onPress={() => deleteUser(user)}
              >
                <Text style={[styles.actionButtonText, { color: '#FF3B30' }]}>Supprimer</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{isEditing ? "Modifier l'utilisateur" : 'Ajouter un utilisateur'}</Text>

            <TextInput
              style={styles.input}
              placeholder="Prénom"
              value={editForm.firstName}
              onChangeText={(text) => setEditForm({ ...editForm, firstName: text })}
            />

            <TextInput
              style={styles.input}
              placeholder="Nom"
              value={editForm.lastName}
              onChangeText={(text) => setEditForm({ ...editForm, lastName: text })}
            />

            <TextInput
              style={styles.input}
              placeholder="Téléphone"
              value={editForm.phoneNumber}
              onChangeText={(text) => setEditForm({ ...editForm, phoneNumber: text })}
            />

            <TextInput
              style={styles.input}
              placeholder="Email"
              value={editForm.email}
              onChangeText={(text) => setEditForm({ ...editForm, email: text })}
            />

            <TextInput
              style={styles.input}
              placeholder="Rôle (CLIENT, MECANICIEN, ADMIN)"
              value={editForm.role}
              onChangeText={(text) => setEditForm({ ...editForm, role: text })}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveUser} style={styles.saveButton}>
                <Text style={styles.saveButtonText}>{isEditing ? 'Sauvegarder' : 'Créer'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#007AFF',
    borderBottomWidth: 1,
    borderBottomColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
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
    backgroundColor: '#007AFF',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#000',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
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
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
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
  addButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#0A1F44',
    fontWeight: '700',
    fontSize: 14,
  },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  Dimensions,
  Image,
  Switch,
  DeviceEventEmitter,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE_URL } from '@/config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Plus, Edit, Trash2, Eye, EyeOff, ArrowLeft, Moon, Image as ImageIcon, Link as LinkIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

interface Ad {
  _id: string;
  title: string;
  description: string;
  imageUrl: string;
  targetUrl: string;
  active?: boolean;
  isPublished?: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdsManagementScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    targetUrl: '',
    active: true,
    isPublished: false,
  });
  const [isDarkMode, setIsDarkMode] = useState(false);

  const theme = isDarkMode
    ? {
        background: '#121212',
        headerBackground: '#0A1F44',
        borderColor: '#2C2C2E',
        textPrimary: '#FFFFFF',
        textSecondary: '#A0A0A0',
        cardBackground: '#1F1F1F',
        iconColor: '#FFFFFF',
        headerTextColor: '#FFFFFF',
      }
    : {
        background: '#F5F5F5',
        headerBackground: '#007AFF',
        borderColor: '#E0E0E0',
        textPrimary: '#000000',
        textSecondary: '#666666',
        cardBackground: '#FFFFFF',
        iconColor: '#000000',
        headerTextColor: '#FFFFFF',
      };

  const handleToggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  useEffect(() => {
    if (profile) {
      loadAds();
    }
  }, [profile]);

  const loadAds = async (pageNum = 1, append = false) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch(`${API_BASE_URL}/ads/admin`, { headers });
      if (response.ok) {
        const payload = await response.json();
        const list = Array.isArray(payload.data) ? payload.data : [];
        const newAds = list.map((ad: any) => ({
          _id: ad._id,
          title: ad.title,
          description: ad.description,
          imageUrl: ad.imageUrl,
          targetUrl: ad.targetUrl,
          active: ad.active ?? true,
          isPublished: ad.isPublished ?? false,
          createdAt: ad.createdAt,
          updatedAt: ad.updatedAt,
        }));

        const merge = append ? [...ads, ...newAds] : newAds;
        const seen = new Set<string>();
        const unique = merge.filter((a: any) => {
          const raw = a?._id || (a as any)?.id;
          const id = raw ? String(raw) : '';
          if (!id || seen.has(id)) return false;
          seen.add(id);
          return true;
        });
        setAds(unique);
        setHasMore(false);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading ads:', error);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    // pagination non supportée côté API pour /ads/admin -> pas de loadMore
  };

  const saveAd = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const method = editingAd ? 'PUT' : 'POST';
      const url = editingAd ? `${API_BASE_URL}/ads/${editingAd._id}` : `${API_BASE_URL}/ads`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          imageUrl: formData.imageUrl,
          targetUrl: formData.targetUrl,
          active: formData.active,
          isPublished: formData.isPublished,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      Alert.alert('Succès', `Publicité ${editingAd ? 'modifiée' : 'créée'} avec succès`);
      setModalVisible(false);
      resetForm();
      loadAds();
      DeviceEventEmitter.emit('ads:updated');
    } catch (error) {
      console.error('Error saving ad:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la publicité');
    }
  };

  const toggleAdStatus = async (ad: Ad) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/ads/${ad._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ isPublished: !((ad as any).isPublished) }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      loadAds();
      DeviceEventEmitter.emit('ads:updated');
    } catch (error) {
      console.error('Error toggling ad status:', error);
      Alert.alert('Erreur', 'Impossible de modifier le statut');
    }
  };

  const deleteAd = async (ad: Ad) => {
    Alert.alert(
      'Confirmer la suppression',
      `Voulez-vous supprimer la publicité "${ad.title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('authToken');
              const response = await fetch(`${API_BASE_URL}/ads/${ad._id}`, {
                method: 'DELETE',
                headers: {
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
              });

              if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
              }

              loadAds();
              DeviceEventEmitter.emit('ads:updated');
            } catch (error) {
              console.error('Error deleting ad:', error);
              Alert.alert('Erreur', 'Impossible de supprimer la publicité');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      imageUrl: '',
      targetUrl: '',
      active: true,
      isPublished: false,
    });
    setEditingAd(null);
  };

  const openEditModal = (ad: Ad) => {
    setEditingAd(ad);
    setFormData({
      title: ad.title,
      description: ad.description,
      imageUrl: ad.imageUrl || '',
      targetUrl: ad.targetUrl || '',
      active: ad.active ?? true,
      isPublished: ad.isPublished ?? false,
    });
    setModalVisible(true);
  };

  const renderAd = ({ item }: { item: Ad }) => (
    <TouchableOpacity onPress={() => openEditModal(item)} style={[styles.adCard, { backgroundColor: theme.cardBackground, borderColor: theme.borderColor }]}>
      <View style={styles.adHeader}>
        <View style={styles.adInfo}>
          <Text style={[styles.adTitle, { color: theme.textPrimary }]}>{item.title}</Text>
          <Text style={[styles.adDescription, { color: theme.textSecondary }]} numberOfLines={2}>
            {item.description}
          </Text>
        </View>
        <View style={styles.adActions}>
          <TouchableOpacity
            onPress={() => toggleAdStatus(item)}
            style={[styles.statusButton, item.isPublished && styles.statusButtonActive]}
          >
            {item.isPublished ? <Eye size={16} color="#fff" /> : <EyeOff size={16} color={theme.iconColor} />}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openEditModal(item)} style={styles.editButton}>
            <Edit size={16} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteAd(item)} style={styles.deleteButton}>
            <Trash2 size={16} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>
      {item.imageUrl && (
        <Image source={{ uri: item.imageUrl }} style={styles.previewImage} />
      )}
      {item.targetUrl && (
        <Text style={[styles.adTargetUrl, { color: '#34C759' }]}>Lien: {item.targetUrl}</Text>
      )}
      <Text style={[styles.adDate, { color: theme.textSecondary }]}>
        Créé le {new Date(item.createdAt).toLocaleDateString('fr-FR')}
      </Text>
    </TouchableOpacity>
  );

  if (!profile) {
    return (
      <View style={styles.centered}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.headerBackground, borderBottomColor: theme.borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.iconColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.headerTextColor }]}>Gestion des Publicités</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleToggleTheme} style={styles.themeButton}>
            <Moon size={20} color={theme.iconColor} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              resetForm();
              setModalVisible(true);
            }}
            style={styles.addButton}
          >
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        style={{ marginTop: Dimensions.get('window').height * 0.1 + 80 }}
        data={ads}
        keyExtractor={(item, index) => {
          const raw = (item as any)?._id || (item as any)?.id;
          const id = raw ? String(raw) : `ad-${index}`;
          return `${id}-${index}`;
        }}
        renderItem={renderAd}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => {
          setPage(1);
          setHasMore(false);
          loadAds(1, false);
        }} />}
        contentContainerStyle={styles.list}
        // pagination désactivée
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMore}>
              <Text style={[styles.loadingMoreText, { color: theme.textSecondary }]}>Chargement...</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>Aucune publicité pour le moment</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              {editingAd ? 'Modifier la publicité' : 'Nouvelle publicité'}
            </Text>

            <TextInput
              style={[styles.input, { borderColor: theme.borderColor, color: theme.textPrimary }]}
              placeholder="Titre"
              placeholderTextColor={theme.textSecondary}
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
            />

            <TextInput
              style={[styles.input, styles.textArea, { borderColor: theme.borderColor, color: theme.textPrimary }]}
              placeholder="Description"
              placeholderTextColor={theme.textSecondary}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              multiline
              numberOfLines={3}
            />

            <TextInput
              style={[styles.input, { borderColor: theme.borderColor, color: theme.textPrimary }]}
              placeholder="URL de l'image (optionnel)"
              placeholderTextColor={theme.textSecondary}
              value={formData.imageUrl}
              onChangeText={(text) => setFormData({ ...formData, imageUrl: text })}
            />

            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.pickButton]}
                onPress={async () => {
                  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                  if (perm.status !== 'granted') {
                    Alert.alert('Permission', 'Autorisez l\'accès aux photos.');
                    return;
                  }
                  const result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7 });
                  if (!result.canceled && result.assets && result.assets.length > 0) {
                    const asset = result.assets[0];
                    const base64 = asset.base64;
                    if (base64) {
                      const dataUrl = `data:image/jpeg;base64,${base64}`;
                      setFormData({ ...formData, imageUrl: dataUrl });
                    }
                  }
                }}
              >
                <ImageIcon size={16} color="#fff" />
                <Text style={styles.pickButtonText}>Choisir depuis l'appareil</Text>
              </TouchableOpacity>
              {!!formData.imageUrl && (
                <Image source={{ uri: formData.imageUrl }} style={styles.previewImage} />
              )}
            </View>

            <TextInput
              style={[styles.input, { borderColor: theme.borderColor, color: theme.textPrimary }]}
              placeholder="URL de destination (optionnel)"
              placeholderTextColor={theme.textSecondary}
              value={formData.targetUrl}
              onChangeText={(text) => setFormData({ ...formData, targetUrl: text })}
            />

            <View style={[styles.row, { justifyContent: 'space-between' }]}>
              <Text style={{ color: theme.textPrimary, fontWeight: '600' }}>Publier maintenant</Text>
              <Switch
                value={formData.isPublished}
                onValueChange={(v) => setFormData({ ...formData, isPublished: v })}
                trackColor={{ false: '#E0E0E0', true: '#34C759' }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.cardBackground, borderColor: theme.borderColor }]}
              >
                <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveAd} style={[styles.modalButton, styles.saveButton]}>
                <Text style={styles.saveButtonText}>Sauvegarder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    position: 'absolute',
    top: Dimensions.get('window').height * 0.1,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  themeButton: {
    padding: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  list: {
    padding: 16,
  },
  adCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  adHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  adInfo: {
    flex: 1,
  },
  adTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  adDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  adActions: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  statusButtonActive: {
    backgroundColor: '#34C759',
  },
  editButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#e3f2fd',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#ffebee',
  },
  adImageUrl: {
    fontSize: 12,
    marginTop: 8,
  },
  adTargetUrl: {
    fontSize: 12,
    marginTop: 4,
  },
  adDate: {
    fontSize: 12,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  pickButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
  },
  loadingMore: {
    padding: 16,
    alignItems: 'center',
  },
  loadingMoreText: {
    fontSize: 14,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

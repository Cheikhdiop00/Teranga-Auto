import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { LogOut, User, Phone, MapPin, Mail, Edit3 } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/config/api';

export default function ClientProfileScreen() {
  const { profile, signOut, updateProfile } = useAuth() as any;
  const router = useRouter();
  const initialPhoto = (profile as any)?.profilePhoto || (profile as any)?.profile_photo;
  const [photoUri, setPhotoUri] = useState<string | undefined>(initialPhoto);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        try {
          const token = await AsyncStorage.getItem('authToken');
          const res = await fetch(`${API_URL}/api/auth/me`, {
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          });
          if (!res.ok) return;
          const user = await res.json();
          if (!mounted) return;
          const p = user?.profilePhoto || user?.profile_photo;
          if (p) setPhotoUri(p);
          if (typeof updateProfile === 'function') {
            updateProfile({
              first_name: user?.firstName ?? profile?.first_name,
              last_name: user?.lastName ?? profile?.last_name,
              phone: user?.phoneNumber ?? profile?.phone,
              address: user?.address ?? profile?.address,
              profile_photo: p ?? initialPhoto,
            });
          }
        } catch {}
      })();
      return () => {
        mounted = false;
      };
    }, [])
  );

  const handleSignOut = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnexion',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/auth/login');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profil</Text>
        <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/edit-profile')}>
          <Edit3 color="#007AFF" size={20} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={{ width: 100, height: 100, borderRadius: 50 }} />
            ) : (
              <Text style={styles.avatarText}>
                {profile?.first_name?.[0]}
                {profile?.last_name?.[0]}
              </Text>
            )}
          </View>
          <Text style={styles.name}>
            {profile?.first_name} {profile?.last_name}
          </Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>Client</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <User color="#666" size={20} />
            <Text style={styles.infoLabel}>Nom complet</Text>
            <Text style={styles.infoValue}>
              {profile?.first_name} {profile?.last_name}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Phone color="#666" size={20} />
            <Text style={styles.infoLabel}>Téléphone</Text>
            <Text style={styles.infoValue}>{profile?.phone}</Text>
          </View>

          <View style={styles.infoRow}>
            <MapPin color="#666" size={20} />
            <Text style={styles.infoLabel}>Adresse</Text>
            <Text style={styles.infoValue}>{profile?.address}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <LogOut color="#FF3B30" size={20} />
          <Text style={styles.logoutText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  editBtn: {
    padding: 8,
  },
  content: {
    padding: 16,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  typeBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
});

import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/config/api';
import { ArrowLeft, Save } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useEffect } from 'react';

export default function EditClientProfileScreen() {
  const { profile, updateProfile } = useAuth() as any;
  const router = useRouter();
  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState<string | undefined>((profile as any)?.profilePhoto || (profile as any)?.profile_photo);

  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permissions', 'Autorisez l’accès à la galerie pour changer la photo.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });
      if (res.canceled) return;
      const asset = res.assets?.[0];
      if (asset?.base64) {
        // Stocker en Data URL pour l’envoyer au backend
        const mime = (asset as any)?.mimeType || 'image/jpeg';
        const dataUrl = `data:${mime};base64,${asset.base64}`;
        setPhoto(dataUrl);
      } else if (asset?.uri) {
        // Fallback: utiliser l’URI (selon backend, peut ne pas être accessible)
        setPhoto(asset.uri);
      }
    } catch (e) {
      Alert.alert('Photo de profil', 'Impossible de sélectionner la photo.');
    }
  };

  // Synchroniser la photo locale si le profil (contexte) est mis à jour ailleurs
  useEffect(() => {
    const p = (profile as any)?.profilePhoto || (profile as any)?.profile_photo;
    if (p) setPhoto(p);
  }, [profile]);

  const onSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Profil', 'Le prénom et le nom sont obligatoires.');
      return;
    }
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('authToken');
      const res = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ firstName, lastName, phoneNumber, profilePhoto: photo, email: undefined, address }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || 'Échec de la mise à jour');
      }
      const json = await res.json().catch(() => ({}));
      const updatedUser = json?.user || {};
      // Mettre à jour le profil dans le contexte pour refléter immédiatement l'avatar
      if (typeof updateProfile === 'function') {
        updateProfile({
          first_name: updatedUser.firstName ?? firstName,
          last_name: updatedUser.lastName ?? lastName,
          phone: updatedUser.phoneNumber ?? phoneNumber,
          address: updatedUser.address ?? address,
          profile_photo: updatedUser.profilePhoto ?? photo,
        });
      }
      // Mettre aussi à jour l'aperçu local si l'écran reste ouvert
      if (updatedUser.profilePhoto || photo) {
        setPhoto(updatedUser.profilePhoto ?? photo);
      }
      Alert.alert('Profil', 'Informations mises à jour avec succès.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert('Profil', e?.message || 'Impossible de sauvegarder.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <ArrowLeft color="#0A1F44" size={22} />
        </TouchableOpacity>
        <Text style={styles.title}>Modifier le profil</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.avatarContainer}>
            <TouchableOpacity style={styles.avatar} onPress={pickImage} activeOpacity={0.8}>
              {photo ? (
                <Image source={{ uri: photo }} style={{ width: 96, height: 96, borderRadius: 48 }} />
              ) : (
                <Text style={styles.avatarText}>
                  {(firstName || profile?.first_name || 'U')[0]}
                  {(lastName || profile?.last_name || '').toString().charAt(0)}
                </Text>
              )}
            </TouchableOpacity>
            <Text style={styles.avatarHint}>Touchez l’avatar pour changer la photo</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Prénom</Text>
            <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="Prénom" />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Nom</Text>
            <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Nom" />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Téléphone</Text>
            <TextInput style={styles.input} value={phoneNumber} onChangeText={setPhoneNumber} placeholder="Téléphone" keyboardType="phone-pad" />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Adresse</Text>
            <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Adresse" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={onSave} disabled={saving}>
          <Save color="#fff" size={18} />
          <Text style={styles.saveText}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingBottom: 12, paddingHorizontal: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  iconBtn: { padding: 6 },
  title: { fontSize: 20, fontWeight: '700', color: '#0A1F44' },
  content: { padding: 16 },
  avatarContainer: { alignItems: 'center', marginBottom: 16 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#0A1F44' },
  avatarHint: { marginTop: 8, fontSize: 12, color: '#6B7280' },
  field: { marginBottom: 14 },
  label: { fontSize: 13, color: '#6B7280', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  footer: { backgroundColor: '#fff', padding: 12, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#0A1F44', paddingVertical: 12, borderRadius: 10 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

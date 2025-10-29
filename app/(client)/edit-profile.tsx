import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { useClientTheme } from '@/contexts/ClientThemeContext';
import type { ClientThemeColors } from '@/contexts/ClientThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/config/api';
import { ArrowLeft, Save } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

export default function EditClientProfileScreen() {
  const { profile, updateProfile } = useAuth() as any;
  const router = useRouter();
  const { colors } = useClientTheme();
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

  const themedStyles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={themedStyles.container}>
      <View style={themedStyles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Retour"
          style={themedStyles.backButton}
        >
          <ArrowLeft color="#fff" size={20} />
        </TouchableOpacity>
        <Text style={themedStyles.title}>Modifier le profil</Text>
        <TouchableOpacity
          style={[themedStyles.saveButton, saving && { opacity: 0.6 }]}
          onPress={onSave}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Enregistrer les modifications"
        >
          <Save color="#fff" size={16} />
          <Text style={themedStyles.saveButtonText}>{saving ? '...' : 'Enregistrer'}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={themedStyles.content} keyboardShouldPersistTaps="handled">
          <View style={themedStyles.avatarContainer}>
            <TouchableOpacity style={themedStyles.avatar} onPress={pickImage} activeOpacity={0.8}>
              {photo ? (
                <Image source={{ uri: photo }} style={{ width: 96, height: 96, borderRadius: 48 }} />
              ) : (
                <Text style={themedStyles.avatarText}>
                  {(firstName || profile?.first_name || 'U')[0]}
                  {(lastName || profile?.last_name || '').toString().charAt(0)}
                </Text>
              )}
            </TouchableOpacity>
            <Text style={themedStyles.avatarHint}>Touchez l’avatar pour changer la photo</Text>
          </View>
          <View style={themedStyles.field}>
            <Text style={themedStyles.label}>Prénom</Text>
            <TextInput
              style={themedStyles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Prénom"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={themedStyles.field}>
            <Text style={themedStyles.label}>Nom</Text>
            <TextInput
              style={themedStyles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Nom"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={themedStyles.field}>
            <Text style={themedStyles.label}>Téléphone</Text>
            <TextInput
              style={themedStyles.input}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="Téléphone"
              keyboardType="phone-pad"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={themedStyles.field}>
            <Text style={themedStyles.label}>Adresse</Text>
            <TextInput
              style={themedStyles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="Adresse"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (colors: ClientThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingTop: 60,
      paddingBottom: 20,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.accent,
      gap: 12,
    },
    backButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.4)',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.12)',
    },
    title: {
      flex: 1,
      fontSize: 22,
      fontWeight: '700',
      textAlign: 'center',
      color: colors.accentContrast,
    },
    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      height: 34,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.4)',
      backgroundColor: 'rgba(255,255,255,0.16)',
    },
    saveButtonText: {
      color: colors.accentContrast,
      fontSize: 13,
      fontWeight: '600',
    },
    content: {
      padding: 20,
      gap: 20,
    },
    avatarContainer: { alignItems: 'center', marginBottom: 16 },
    avatar: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    avatarText: { fontSize: 32, fontWeight: '700', color: colors.textPrimary },
    avatarHint: { marginTop: 8, fontSize: 12, color: colors.textSecondary },
    field: { marginBottom: 14 },
    label: { fontSize: 13, color: colors.textSecondary, marginBottom: 6 },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.textPrimary,
    },
  });

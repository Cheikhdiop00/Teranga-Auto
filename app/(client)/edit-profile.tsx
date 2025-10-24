import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/config/api';
import { ArrowLeft, Save } from 'lucide-react-native';

export default function EditClientProfileScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [saving, setSaving] = useState(false);

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
        body: JSON.stringify({ firstName, lastName, phoneNumber, profilePhoto: undefined, email: undefined, address }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || 'Échec de la mise à jour');
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
  field: { marginBottom: 14 },
  label: { fontSize: 13, color: '#6B7280', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  footer: { backgroundColor: '#fff', padding: 12, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#0A1F44', paddingVertical: 12, borderRadius: 10 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

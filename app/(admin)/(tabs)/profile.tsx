import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, ScrollView, Image } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { LogOut, User, Phone, MapPin, Mail, Lock, ArrowLeft } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

export default function AdminProfileScreen() {
  const { profile, user, signOut, updateProfile } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [pendingFirstName, setPendingFirstName] = useState(profile?.first_name ?? '');
  const [pendingLastName, setPendingLastName] = useState(profile?.last_name ?? '');
  const [pendingPhone, setPendingPhone] = useState(profile?.phone ? `+221${profile.phone.replace(/^\+?221/, '')}` : '+221');
  const [pendingAddress, setPendingAddress] = useState(profile?.address ?? '');
  const [pendingEmail, setPendingEmail] = useState(user?.email ?? '');
  const [pendingPassword, setPendingPassword] = useState('');
  const [pendingPasswordConfirm, setPendingPasswordConfirm] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const normalizePhone = (phone: string) => phone.replace(/[^\d]/g, '');
  const ensurePrefix = (phone: string) => {
    const digits = normalizePhone(phone).replace(/^221/, '');
    return `+221${digits}`;
  };
  const isValidSenegalPhone = (phone: string) => {
    const normalized = ensurePrefix(phone);
    const senegalRegex = /^\+2217[05678]\d{7}$/;
    return senegalRegex.test(normalized);
  };

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

  const handleToggleEdit = () => {
    if (isEditing) {
      if (!pendingFirstName || !pendingLastName) {
        Alert.alert('Erreur', 'Veuillez renseigner le nom et prénom');
        return;
      }
      if (!isValidSenegalPhone(pendingPhone)) {
        Alert.alert('Erreur', 'Veuillez saisir un numéro de téléphone sénégalais valide (ex: +221 77 123 45 67)');
        return;
      }
      if (!pendingEmail) {
        Alert.alert('Erreur', 'Veuillez saisir une adresse e-mail valide');
        return;
      }
      if (pendingPassword !== pendingPasswordConfirm) {
        Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
        return;
      }
      updateProfile?.({
        first_name: pendingFirstName,
        last_name: pendingLastName,
        phone: pendingPhone,
        address: pendingAddress,
      }).catch(() => {
        Alert.alert('Attention', 'Impossible de sauvegarder côté backend (mode démo)');
      });
      Alert.alert('Succès', 'Informations mises à jour (mode démo)');
      setPendingPassword('');
      setPendingPasswordConfirm('');
      setIsEditing(false);
    } else {
      setPendingFirstName(profile?.first_name ?? '');
      setPendingLastName(profile?.last_name ?? '');
      setPendingPhone(profile?.phone ? ensurePrefix(profile.phone) : '+221');
      setPendingAddress(profile?.address ?? '');
      setPendingEmail(user?.email ?? '');
      setPendingPassword('');
      setPendingPasswordConfirm('');
      setAvatarUri(null);
      setIsEditing(true);
    }
  };

  const handlePickAvatar = async () => {
    if (!isEditing) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission requise', 'Veuillez autoriser l’accès à la galerie pour sélectionner une photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="#FFFFFF" size={20} />
        </TouchableOpacity>
        <Text style={styles.title}>Profil</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarContainer}>
          <TouchableOpacity
            style={styles.avatar}
            activeOpacity={0.8}
            onPress={handlePickAvatar}
            disabled={!isEditing}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {pendingFirstName[0]}
                {pendingLastName[0]}
              </Text>
            )}
          </TouchableOpacity>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>Administrateur</Text>
          </View>
          {!isEditing && (
            <Text style={styles.name}>
              {profile?.first_name} {profile?.last_name}
            </Text>
          )}
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRowWithInputSection}>
            <View style={styles.infoRowStatic}>
              <User color="#0A1F44" size={20} />
              <Text style={styles.infoLabel}>Nom complet</Text>
            </View>
            {isEditing ? (
              <View style={styles.nameInputs}>
                <TextInput
                  style={styles.nameInput}
                  value={pendingFirstName}
                  onChangeText={setPendingFirstName}
                  placeholder="Prénom"
                />
                <TextInput
                  style={styles.nameInput}
                  value={pendingLastName}
                  onChangeText={setPendingLastName}
                  placeholder="Nom"
                />
              </View>
            ) : (
              <Text style={styles.infoValue}>
                {profile?.first_name} {profile?.last_name}
              </Text>
            )}
          </View>

          <View style={styles.infoRowWithInputSection}>
            <View style={styles.infoRowStatic}>
              <Phone color="#0A1F44" size={20} />
              <Text style={styles.infoLabel}>Téléphone</Text>
            </View>
            {isEditing ? (
              <TextInput
                style={styles.infoInput}
                value={pendingPhone}
                onChangeText={(text) => setPendingPhone(ensurePrefix(text))}
                keyboardType="phone-pad"
                placeholder="+221 XXX XX XX"
                maxLength={13}
              />
            ) : (
              <Text style={styles.infoValue}>{profile?.phone}</Text>
            )}
          </View>

          <View style={styles.infoRowWithInputSection}>
            <View style={styles.infoRowStatic}>
              <MapPin color="#0A1F44" size={20} />
              <Text style={styles.infoLabel}>Adresse</Text>
            </View>
            {isEditing ? (
              <TextInput
                style={styles.infoInput}
                value={pendingAddress}
                onChangeText={setPendingAddress}
              />
            ) : (
              <Text style={styles.infoValue}>{profile?.address}</Text>
            )}
          </View>

          <View style={styles.infoRowWithInputSection}>
            <View style={styles.infoRowStatic}>
              <Mail color="#0A1F44" size={20} />
              <Text style={styles.infoLabel}>Adresse e-mail</Text>
            </View>
            {isEditing ? (
              <TextInput
                style={styles.infoInput}
                value={pendingEmail}
                onChangeText={setPendingEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            ) : (
              <Text style={styles.infoValue}>{user?.email}</Text>
            )}
          </View>

          <View style={styles.infoRowWithInputSection}>
            <View style={styles.infoRowStatic}>
              <Lock color="#0A1F44" size={20} />
              <Text style={styles.infoLabel}>Mot de passe</Text>
            </View>
            {isEditing ? (
              <TextInput
                style={styles.infoInput}
                value={pendingPassword}
                onChangeText={setPendingPassword}
                secureTextEntry
                placeholder="Nouveau mot de passe"
              />
            ) : (
              <Text style={styles.infoValue}>********</Text>
            )}
          </View>

          {isEditing && (
            <View style={[styles.infoRowWithInputSection, { borderBottomWidth: 0 }]}>
              <View style={styles.infoRowStatic}>
                <Lock color="#0A1F44" size={20} />
                <Text style={styles.infoLabel}>Confirmer le mot de passe</Text>
              </View>
              <TextInput
                style={styles.infoInput}
                value={pendingPasswordConfirm}
                onChangeText={setPendingPasswordConfirm}
                secureTextEntry
                placeholder="Confirmer le mot de passe"
              />
            </View>
          )}
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.editButton} onPress={handleToggleEdit}>
            <Text style={styles.editButtonText}>{isEditing ? 'Enregistrer les modifications' : 'Modifier le profil'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
            <LogOut color="#FFFFFF" size={20} />
            <Text style={styles.logoutText}>Déconnexion</Text>
          </TouchableOpacity>
        </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  backButton: {
    padding: 8,
  },
  headerSpacer: {
    width: 28,
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
    backgroundColor: '#0A1F44',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
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
    color: '#333333',
  },
  nameInputs: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  nameInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  typeBadge: {
    backgroundColor: '#0A1F44',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  infoRowWithInputSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    gap: 12,
  },
  infoRowStatic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#0A1F44',
    marginLeft: 12,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0A1F44',
  },
  infoInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '500',
  },
  actionsContainer: {
    gap: 12,
  },
  editButton: {
    backgroundColor: '#0A1F44',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A1F44',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, ScrollView, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { LogOut, User, Phone, MapPin, Wrench, Star, Mail, Lock, Camera } from 'lucide-react-native';
import { useState, useEffect, useCallback } from 'react';
import { getCollection } from '@/lib/supabase';
import { API_URL } from '@/config/api';

export default function MechanicProfileScreen() {
  const { profile, signOut, updateProfile, user } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    email: user?.email || '',
    phone: profile?.phone || '',
    address: profile?.address || '',
    specialties: profile?.specialties?.join(', ') || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Mettre à jour le formulaire lorsque le profil ou l'utilisateur change
  useEffect(() => {
    if (profile || user) {
      setFormData(prev => ({
        ...prev,
        first_name: profile?.first_name || '',
        last_name: profile?.last_name || '',
        email: user?.email || '',
        phone: profile?.phone || '',
        address: profile?.address || '',
        specialties: profile?.specialties?.join(', ') || ''
        // On ne réinitialise pas les champs de mot de passe pour ne pas perdre la saisie en cours
      }));
      if (profile?.photo_url) {
        setAvatar(profile.photo_url);
      }
    }
  }, [profile, user]);
  const [avatar, setAvatar] = useState(profile?.photo_url || null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const uploadPhoto = useCallback(async (dataUrl: string) => {
    try {
      setUploadingAvatar(true);
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ base64: dataUrl }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: 'Échec du téléversement.' }));
        throw new Error(err.message || 'Échec du téléversement.');
      }

      const payload = await response.json();
      if (!payload?.url) {
        throw new Error('Réponse inattendue du serveur.');
      }

      setAvatar(payload.url);
      return payload.url as string;
    } catch (error: any) {
      console.error('Erreur upload photo:', error);
      Alert.alert('Photo', error?.message || 'Impossible de téléverser la photo.');
      return null;
    } finally {
      setUploadingAvatar(false);
    }
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Nous avons besoin de la permission d\'accéder à votre galerie pour sélectionner une photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      try {
        let base64Data = asset.base64;
        if (!base64Data) {
          base64Data = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
        }
        const mime = asset.mimeType || asset.type || 'image/jpeg';
        const dataUrl = `data:${mime};base64,${base64Data}`;
        await uploadPhoto(dataUrl);
      } catch (error) {
        console.error('Erreur préparation photo:', error);
        Alert.alert('Photo', "Impossible de préparer l'image sélectionnée.");
      }
    }
  };

  const handleSave = async () => {
    try {
      // Vérifier si un nouveau mot de passe est fourni
      if (formData.newPassword || formData.confirmPassword) {
        // Vérifier si l'ancien mot de passe est fourni
        if (!formData.currentPassword) {
          Alert.alert('Erreur', 'Veuillez entrer votre mot de passe actuel pour effectuer des modifications');
          return;
        }
        
        // Vérifier que les nouveaux mots de passe correspondent
        if (formData.newPassword !== formData.confirmPassword) {
          Alert.alert('Erreur', 'Les nouveaux mots de passe ne correspondent pas');
          return;
        }
        
        // Vérifier la force du mot de passe
        if (formData.newPassword.length < 6) {
          Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
          return;
        }
      }

      // Mise à jour des informations de base
      const updates: any = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        specialties: formData.specialties.split(',').map(s => s.trim()).filter(Boolean),
      };

      // Mise à jour du mot de passe si fourni
      if (formData.newPassword && formData.currentPassword) {
        // Appel API pour mettre à jour le mot de passe
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/update-password`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await AsyncStorage.getItem('authToken')}`
          },
          body: JSON.stringify({
            currentPassword: formData.currentPassword,
            newPassword: formData.newPassword
          }),
        });
        
        if (!response.ok) {
          throw new Error('Le mot de passe actuel est incorrect');
        }
      }

      // Mise à jour de la photo de profil si elle a changé
      if (avatar && avatar !== profile?.photo_url) {
        updates.photo_url = avatar;
      }

      // Mise à jour du profil dans la base de données
      await updateProfile(updates);
      
      // Mise à jour de l'email si nécessaire
      if (formData.email !== user?.email) {
        // Appel API pour mettre à jour l'email
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/update-email`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await AsyncStorage.getItem('authToken')}`
          },
          body: JSON.stringify({ email: formData.email }),
        });
        
        if (!response.ok) {
          throw new Error('Impossible de mettre à jour l\'email');
        }
        await AsyncStorage.setItem('userEmail', formData.email);
      }

      setIsEditing(false);
      Alert.alert('Succès', 'Profil mis à jour avec succès');
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      Alert.alert(
        'Erreur', 
        error instanceof Error ? error.message : 'Une erreur est survenue lors de la mise à jour du profil'
      );
    }
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      // Si on ne peut pas revenir en arrière, on redirige vers l'écran d'accueil
      router.replace('/(tabs)');
    }
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleGoBack}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
        {isEditing ? (
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>Enregistrer</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => {
              console.log('Bouton Modifier cliqué');
              setIsEditing(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.editButtonText, {color: '#FFFFFF'}]}>Modifier</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarContainer}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {formData.first_name[0]}
                  {formData.last_name[0]}
                </Text>
              </View>
            )}
            {isEditing && (
              <TouchableOpacity style={styles.cameraButton} onPress={pickImage}>
                <Camera size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
          {!isEditing ? (
            <>
              <Text style={styles.name}>
                {formData.first_name} {formData.last_name}
              </Text>
              <View style={styles.typeBadge}>
                <Text style={styles.typeText}>Mécanicien</Text>
              </View>
              <View style={styles.ratingContainer}>
                <Star color="#FFD700" size={20} fill="#FFD700" />
                <Text style={styles.ratingText}>
                  {profile?.rating_average?.toFixed(1)} ({profile?.rating_count} avis)
                </Text>
              </View>
            </>
          ) : null}
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <User color="#666" size={20} />
            <Text style={styles.infoLabel}>Prénom</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={formData.first_name}
                onChangeText={(text) => handleInputChange('first_name', text)}
              />
            ) : (
              <Text style={styles.infoValue}>{formData.first_name}</Text>
            )}
          </View>

          <View style={styles.infoRow}>
            <User color="#666" size={20} />
            <Text style={styles.infoLabel}>Nom</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={formData.last_name}
                onChangeText={(text) => handleInputChange('last_name', text)}
              />
            ) : (
              <Text style={styles.infoValue}>{formData.last_name}</Text>
            )}
          </View>

          <View style={styles.infoRow}>
            <Phone color="#666" size={20} />
            <Text style={styles.infoLabel}>Téléphone</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(text) => handleInputChange('phone', text)}
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.infoValue}>{formData.phone}</Text>
            )}
          </View>

          <View style={styles.infoRow}>
            <MapPin color="#666" size={20} />
            <Text style={styles.infoLabel}>Adresse</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={formData.address}
                onChangeText={(text) => handleInputChange('address', text)}
                multiline
              />
            ) : (
              <Text style={styles.infoValue}>{formData.address}</Text>
            )}
          </View>

          <View style={styles.infoRow}>
            <Wrench color="#666" size={20} />
            <Text style={styles.infoLabel}>Spécialités</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={formData.specialties}
                onChangeText={(text) => handleInputChange('specialties', text)}
                placeholder="Séparées par des virgules"
              />
            ) : (
              <Text style={styles.infoValue}>
                {formData.specialties || 'Aucune'}
              </Text>
            )}
          </View>

          {isEditing && (
            <>
              <View style={styles.infoRow}>
                <Mail color="#666" size={20} />
                <Text style={styles.infoLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(text) => handleInputChange('email', text)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="votre@email.com"
                />
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>Sécurité</Text>
              </View>

              <View style={styles.infoRow}>
                <Lock color="#666" size={20} />
                <Text style={styles.infoLabel}>Mot de passe actuel</Text>
                <TextInput
                  style={styles.input}
                  value={formData.currentPassword}
                  onChangeText={(text) => handleInputChange('currentPassword', text)}
                  secureTextEntry
                  placeholder="Obligatoire pour les modifications"
                />
              </View>

              <View style={styles.infoRow}>
                <Lock color="#666" size={20} />
                <Text style={styles.infoLabel}>Nouveau mot de passe</Text>
                <TextInput
                  style={styles.input}
                  value={formData.newPassword}
                  onChangeText={(text) => handleInputChange('newPassword', text)}
                  secureTextEntry
                  placeholder="Laisser vide pour ne pas changer"
                />
              </View>

              {formData.newPassword ? (
                <View style={styles.infoRow}>
                  <Lock color="#666" size={20} />
                  <Text style={styles.infoLabel}>Confirmer le mot de passe</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.confirmPassword}
                    onChangeText={(text) => handleInputChange('confirmPassword', text)}
                    secureTextEntry
                    placeholder="Confirmez le nouveau mot de passe"
                  />
                </View>
              ) : null}
            </>
          )}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <LogOut color="#FFFFFF" size={20} />
          <Text style={styles.logoutText}>Déconnexion</Text>
        </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: '#007AFF',
    paddingTop: 60,
    width: '100%',
    position: 'relative',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    flex: 1,
  },
  editButton: {
    padding: 8,
    zIndex: 10,
    minWidth: 80,
    alignItems: 'flex-end',
  },
  editButtonText: {
    color: '#0A1F44',
    fontWeight: '500',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  input: {
    flex: 2,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#FFF',
    fontSize: 14,
    color: '#000',
    minHeight: 40,
  },
  saveButton: {
    padding: 8,
    backgroundColor: '#34C759',
    borderRadius: 4,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#34C759',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  cameraButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#0A1F44',
    borderRadius: 20,
    padding: 8,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#34C759',
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
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  typeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '500',
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
    flex: 2,
    textAlign: 'right',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

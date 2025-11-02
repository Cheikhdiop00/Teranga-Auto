import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { useClientTheme } from '@/contexts/ClientThemeContext';
import type { ClientThemeColors } from '@/contexts/ClientThemeContext';
import { LogOut, User, Phone, MapPin, Mail, Edit3, ArrowLeft } from 'lucide-react-native';
import { useMemo, useState, useEffect } from 'react';

export default function ClientProfileScreen() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const { colors } = useClientTheme();
  const [photoUri, setPhotoUri] = useState<string | undefined>(profile?.photo_url);

  useEffect(() => {
    setPhotoUri(profile?.photo_url);
  }, [profile?.photo_url]);

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
        <Text style={themedStyles.title}>Profil</Text>
        <View style={themedStyles.headerActions}>
          <TouchableOpacity style={themedStyles.iconButton} onPress={() => router.push('/edit-profile')}>
            <Edit3 color="#fff" size={18} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={themedStyles.content}>
        <View style={themedStyles.avatarContainer}>
          <View style={themedStyles.avatar}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={{ width: 100, height: 100, borderRadius: 50 }} />
            ) : (
              <Text style={themedStyles.avatarText}>
                {profile?.first_name?.[0]}
                {profile?.last_name?.[0]}
              </Text>
            )}
          </View>
          <Text style={themedStyles.name}>
            {profile?.first_name} {profile?.last_name}
          </Text>
          <View style={themedStyles.typeBadge}>
            <Text style={themedStyles.typeText}>Client</Text>
          </View>
        </View>

        <View style={themedStyles.infoCard}>
          <View style={themedStyles.infoRow}>
            <User color={colors.textSecondary} size={20} />
            <Text style={themedStyles.infoLabel}>Nom complet</Text>
            <Text style={themedStyles.infoValue}>
              {profile?.first_name} {profile?.last_name}
            </Text>
          </View>

          <View style={themedStyles.infoRow}>
            <Phone color={colors.textSecondary} size={20} />
            <Text style={themedStyles.infoLabel}>Téléphone</Text>
            <Text style={themedStyles.infoValue}>{profile?.phone}</Text>
          </View>

          <View style={themedStyles.infoRow}>
            <MapPin color={colors.textSecondary} size={20} />
            <Text style={themedStyles.infoLabel}>Adresse</Text>
            <Text style={themedStyles.infoValue}>{profile?.address}</Text>
          </View>
        </View>

        <TouchableOpacity style={themedStyles.logoutButton} onPress={handleSignOut}>
          <LogOut color={colors.accent} size={18} />
          <Text style={themedStyles.logoutText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>
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
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(255,255,255,0.15)',
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
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.accentContrast,
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
    color: colors.textPrimary,
  },
  typeBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    color: colors.accentContrast,
    fontSize: 12,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 0,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 12,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: `${colors.accent}30`,
    backgroundColor: `${colors.accent}15`,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent,
  },
});

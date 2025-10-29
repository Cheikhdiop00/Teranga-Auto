import React, { useMemo } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Mail, Phone, Smartphone, Code2, Route, Database, Radio, Server, ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useClientTheme } from '@/contexts/ClientThemeContext';
import type { ClientThemeColors } from '@/contexts/ClientThemeContext';

const TECH_STACK = [
  { label: 'React Native (Expo)', icon: Smartphone },
  { label: 'TypeScript', icon: Code2 },
  { label: 'Expo Router', icon: Route },
  { label: 'MongoDB Atlas', icon: Database },
  { label: 'Socket.io temps réel', icon: Radio },
  { label: 'API Node.js/Express', icon: Server },
];

const CONTACT_NUMBERS = [
  { label: 'Support Teranga Auto', number: '+221338891566' },
  { label: 'Assistance générale', number: '+221778001010' },
];

const SUPPORT_EMAIL = 'support@teranga-auto.com';

export default function ClientSupportScreen() {
  const router = useRouter();
  const { colors } = useClientTheme();
  const techItems = useMemo(() => TECH_STACK, []);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const openDialer = async (number: string) => {
    try {
      const sanitized = number.replace(/\s+/g, '');
      const url = `tel:${sanitized}`;
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('Appel impossible', `Composez le ${number} depuis votre téléphone.`);
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('Appel impossible', `Composez le ${number} depuis votre téléphone.`);
    }
  };

  const openMail = async () => {
    const url = `mailto:${SUPPORT_EMAIL}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Email indisponible', `Écrivez-nous sur ${SUPPORT_EMAIL}`);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroHeader}>
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Revenir en arrière"
            style={styles.backButton}
          >
            <ArrowLeft color={colors.accentContrast} size={22} />
          </TouchableOpacity>
          <Text style={styles.title}>Support & assistance</Text>
        </View>
        <Text style={styles.subtitle}>
          Découvrez Teranga Auto, notre vision et la technologie qui alimente votre expérience au quotidien.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>À propos de Teranga Auto</Text>
        <Text style={styles.paragraph}>
          Teranga Auto met en relation les automobilistes et les meilleurs mécaniciens du Sénégal, 24h/24. L’application
          facilite la prise de rendez-vous, la localisation des professionnels et la communication en temps réel pour un
          dépannage rapide et fiable.
        </Text>
        <Text style={styles.paragraph}>
          Grâce à des notifications instantanées, un suivi de mission et un espace de discussion sécurisé, vous gardez le
          contrôle de chaque intervention – du diagnostic jusqu’à la clôture du service.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Technologies utilisées</Text>
        <View style={styles.techList}>
          {techItems.map(({ label, icon: Icon }) => (
            <View key={label} style={styles.techRow}>
              <View style={styles.techIconWrapper}>
                <Icon color={colors.accent} size={18} />
              </View>
              <Text style={styles.techLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Contacter le support</Text>
        <Text style={styles.paragraph}>
          Nous répondons à vos questions commerciales et techniques du lundi au samedi (8h-20h).
        </Text>

        {CONTACT_NUMBERS.map((contact) => (
          <TouchableOpacity
            key={contact.number}
            style={styles.actionButton}
            onPress={() => openDialer(contact.number)}
            activeOpacity={0.85}
          >
            <Phone color={colors.accent} size={20} />
            <View style={styles.actionTextWrapper}>
              <Text style={styles.actionLabel}>{contact.label}</Text>
              <Text style={styles.actionValue}>{contact.number}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.actionButton} onPress={openMail} activeOpacity={0.85}>
          <Mail color={colors.accent} size={20} />
          <View style={styles.actionTextWrapper}>
            <Text style={styles.actionLabel}>Email</Text>
            <Text style={styles.actionValue}>{SUPPORT_EMAIL}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ClientThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 20,
      paddingBottom: 40,
      gap: 20,
    },
    hero: {
      backgroundColor: colors.accent,
      borderRadius: 18,
      padding: 20,
      shadowColor: colors.accent,
      shadowOpacity: 0.25,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
    },
    heroHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.4)',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.12)',
      marginRight: 12,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.accentContrast,
    },
    subtitle: {
      fontSize: 15,
      color: 'rgba(255,255,255,0.9)',
      lineHeight: 22,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 18,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    paragraph: {
      fontSize: 14,
      lineHeight: 21,
      color: colors.textSecondary,
    },
    techList: {
      gap: 8,
    },
    techRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    techIconWrapper: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    techLabel: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    actionTextWrapper: {
      flex: 1,
    },
    actionLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    actionValue: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
  });

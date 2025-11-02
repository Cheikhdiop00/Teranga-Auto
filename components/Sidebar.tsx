import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Animated,
  Dimensions,
  Image,
  Modal,
  Alert,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  History,
  AlertTriangle,
  Sun,
  Moon,
  LogOut,
  MessageSquare,
  MapPin,
  Phone,
  Info,
  X,
} from 'lucide-react-native';
import { useClientTheme } from '@/contexts/ClientThemeContext';
import IconImage from '@/assets/images/Icon.jpg';

type SidebarProps = {
  isVisible: boolean;
  onClose: () => void;
};

export default function Sidebar({ isVisible, onClose }: SidebarProps) {
  const { colors, isDarkMode, toggleTheme } = useClientTheme();
  const router = useRouter();
  const { signOut } = useAuth();

  const drawerWidth = useMemo(() => Math.min(Dimensions.get('window').width * 0.75, 280), []);
  const animatedValue = useMemo(() => new Animated.Value(isVisible ? 1 : 0), []);
  const [emergencyVisible, setEmergencyVisible] = useState(false);

  React.useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: isVisible ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [animatedValue, isVisible]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-drawerWidth, 0],
  });

  const emergencyContacts = useMemo(
    () => [
      { label: 'Police nationale', number: '17' },
      { label: 'Gendarmerie', number: '800201251' },
      { label: 'Sapeurs-pompiers', number: '18' },
      { label: 'SAMU (Urgence médicale)', number: '800000707' },
      { label: 'Sénécartes Assistance', number: '338891566' },
    ],
    [],
  );

  const handleSignOut = async () => {
    await signOut();
    router.replace('/auth/login');
  };

  const handleEmergencyPress = () => {
    setEmergencyVisible(true);
  };

  const closeEmergency = () => setEmergencyVisible(false);

  const handleCallEmergency = async (number: string) => {
    try {
      await Linking.openURL(`tel:${number}`);
    } catch {
      Alert.alert('Erreur', "Impossible de lancer l'appel.");
    }
  };

  const handleAbout = () => {
    Alert.alert('À propos', 'Teranga Auto – Assistance mécanique 24/7.');
    onClose();
  };

  const menuItems = [
    {
      id: 'history',
      icon: <History size={20} color="#fff" />,
      label: 'Historique',
      onPress: () => {
        onClose();
        router.push('/(mechanic)/history' as never);
      },
    },
    {
      id: 'emergency',
      icon: <AlertTriangle size={20} color="#fff" />,
      label: 'Service d\'urgence',
      onPress: handleEmergencyPress,
    },
    {
      id: 'messages',
      icon: <MessageSquare size={20} color="#fff" />,
      label: 'Messages',
      onPress: () => {
        onClose();
        router.push('/(mechanic)/messages' as never);
      },
    },
    {
      id: 'about',
      icon: <Info size={20} color="#fff" />,
      label: 'À propos',
      onPress: handleAbout,
    },
    {
      id: 'theme',
      icon: isDarkMode ? <Moon size={20} color="#fff" /> : <Sun size={20} color="#fff" />,
      label: isDarkMode ? 'Thème sombre' : 'Thème clair',
      rightComponent: (
        <Switch
          value={isDarkMode}
          onValueChange={toggleTheme}
          trackColor={{ false: 'rgba(255,255,255,0.3)', true: '#34C759' }}
          thumbColor={isDarkMode ? '#0F172A' : '#ffffff'}
        />
      ),
    },
    {
      id: 'availability',
      icon: <MapPin size={20} color="#fff" />,
      label: 'Gérer ma disponibilité',
      onPress: () => {
        onClose();
        router.push('/(mechanic)/availability' as never);
      },
    },
    {
      id: 'logout',
      icon: <LogOut size={20} color="#ff3b30" />,
      label: 'Déconnexion',
      onPress: handleSignOut,
      labelStyle: { color: '#ff3b30' },
    },
  ];

  if (!isVisible) return null;

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.drawerContainer, { width: drawerWidth, transform: [{ translateX }] }]}>
        <LinearGradient
          colors={['rgba(15,23,42,0.95)', 'rgba(10,18,35,0.85)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.drawer}
        >
          <View style={styles.drawerHeader}>
            <View style={styles.drawerHeaderLeft}>
              <Image source={IconImage} style={styles.drawerLogo} />
              <View>
                <Text style={styles.drawerTitle}>Espace Mécanicien</Text>
                <Text style={styles.drawerTagline}>TerangaAuto</Text>
              </View>
            </View>
          </View>
          <Text style={styles.drawerSubtitle}>Accédez rapidement à vos actions</Text>
          <View style={styles.menuContainer}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={item.onPress}
                activeOpacity={0.8}
              >
                <View style={styles.menuItemLeft}>
                  <View style={styles.iconBadge}>{item.icon}</View>
                  <Text style={[styles.menuItemText, item.labelStyle]}>{item.label}</Text>
                </View>
                {item.rightComponent ? (
                  <View style={styles.menuRight}>{item.rightComponent}</View>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        </LinearGradient>
      </Animated.View>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

      <Modal visible={emergencyVisible} transparent animationType="fade" onRequestClose={closeEmergency}>
        <View style={styles.modalOverlay}>
          <View style={[styles.emergencyModal, { backgroundColor: '#0F172A' }]}> 
            <View style={styles.emergencyHeader}>
              <Text style={styles.emergencyTitle}>Urgences Sénégal</Text>
              <TouchableOpacity onPress={closeEmergency} style={styles.emergencyClose}>
                <X size={20} color="#CBD5F5" />
              </TouchableOpacity>
            </View>
            <Text style={styles.emergencySubtitle}>Sélectionnez un numéro pour appeler immédiatement.</Text>
            <View style={styles.emergencyList}>
              {emergencyContacts.map((contact) => (
                <TouchableOpacity
                  key={contact.number}
                  style={styles.emergencyItem}
                  onPress={() => handleCallEmergency(contact.number)}
                  activeOpacity={0.85}
                >
                  <View>
                    <Text style={styles.emergencyItemLabel}>{contact.label}</Text>
                    <Text style={styles.emergencyItemNumber}>{contact.number}</Text>
                  </View>
                  <Phone size={20} color="#38BDF8" />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.emergencyFooterBtn} onPress={closeEmergency}>
              <Text style={styles.emergencyFooterText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    zIndex: 50,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
  },
  drawerContainer: {
    position: 'relative',
    height: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 12,
  },
  drawer: {
    ...StyleSheet.absoluteFillObject,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 16,
  },
  drawerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  drawerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  drawerTagline: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  drawerLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  drawerSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  menuContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  menuItem: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuRight: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(4,6,12,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emergencyModal: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.4)',
  },
  emergencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emergencyTitle: {
    color: '#E2E8F0',
    fontSize: 20,
    fontWeight: '700',
  },
  emergencySubtitle: {
    color: '#94A3B8',
    fontSize: 13,
  },
  emergencyClose: {
    padding: 6,
  },
  emergencyList: {
    gap: 10,
  },
  emergencyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(15,23,42,0.85)',
  },
  emergencyItemLabel: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '600',
  },
  emergencyItemNumber: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 2,
  },
  emergencyFooterBtn: {
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.75)',
  },
  emergencyFooterText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
  },
});

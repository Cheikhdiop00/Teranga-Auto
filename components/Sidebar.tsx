import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { History, AlertTriangle, Sun, Moon, Info, LogOut, X } from 'lucide-react-native';

type SidebarProps = {
  isVisible: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
};

export default function Sidebar({ isVisible, onClose, isDarkMode, toggleTheme }: SidebarProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const { signOut } = useAuth();

  if (!isVisible) return null;

  const handleSignOut = async () => {
    await signOut();
    router.replace('/auth/login');
  };

  const menuItems = [
    {
      id: 'history',
      icon: <History size={24} color={colors.text} />,
      label: 'Historique',
      onPress: () => {
        onClose();
        router.push('/(mechanic)/history');
      },
    },
    {
      id: 'emergency',
      icon: <AlertTriangle size={24} color={colors.text} />,
      label: 'Service d\'urgence',
      onPress: () => {
        onClose();
        router.push('/(mechanic)/emergency');
      },
    },
    {
      id: 'theme',
      icon: isDarkMode ? <Moon size={24} color={colors.text} /> : <Sun size={24} color={colors.text} />,
      label: 'Thème sombre',
      rightComponent: (
        <Switch
          value={isDarkMode}
          onValueChange={toggleTheme}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={isDarkMode ? '#f5dd4b' : '#f4f3f4'}
        />
      ),
    },
    {
      id: 'about',
      icon: <Info size={24} color={colors.text} />,
      label: 'À propos',
      onPress: () => {
        onClose();
        router.push('/(mechanic)/about');
      },
    },
    {
      id: 'logout',
      icon: <LogOut size={24} color="#ff3b30" />,
      label: 'Déconnexion',
      onPress: handleSignOut,
      labelStyle: { color: '#ff3b30' },
      style: { marginBottom: 20 },
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Menu</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.menuContainer}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.menuItem, 
              { borderBottomColor: colors.border },
              item.style
            ]}
            onPress={item.onPress}
          >
            <View style={styles.menuItemLeft}>
              {item.icon}
              <Text style={[styles.menuItemText, { color: colors.text }, item.labelStyle]}>
                {item.label}
              </Text>
            </View>
            {item.rightComponent}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 20,
    left: 0,
    bottom: 20,
    width: '60%',
    maxWidth: 250,
    borderRadius: 15,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 5,
  },
  menuContainer: {
    paddingVertical: 10,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  menuItemText: {
    fontSize: 16,
  },
});

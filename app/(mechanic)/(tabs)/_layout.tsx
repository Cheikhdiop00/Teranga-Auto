import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Home, History, MessageCircle, User } from 'lucide-react-native';

export default function MechanicTabsLayout() {
  return (
    <>
      {/* Sous-couche bleu foncé en bas pour remplir l'espace sous la tab bar flottante */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 40, backgroundColor: '#0A1F44' }} />
      <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#34C759',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#0A1F44',
          borderTopWidth: 0,
          paddingBottom: 8,
          paddingTop: 6,
          height: 60,
          position: 'absolute',
          bottom: 36,
          left: 16,
          right: 16,
          borderRadius: 16,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: 5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Missions',
          tabBarIcon: ({ color, size }) => <History color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
      </Tabs>
    </>
  );
}

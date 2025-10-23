import { Tabs } from 'expo-router';
import { Home, History, MessageCircle, User } from 'lucide-react-native';

export default function MechanicTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#34C759',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#0A1F44',
          borderTopWidth: 0,
          paddingBottom: 5,
          height: 60,
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
  );
}

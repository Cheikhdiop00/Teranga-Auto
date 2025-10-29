import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Home, History, MessageCircle, User } from 'lucide-react-native';

export default function MechanicTabsLayout() {
  return (
    <>
      <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#B3D9FF',
        tabBarStyle: {
          backgroundColor: '#007AFF',
          borderTopWidth: 1,
          borderTopColor: '#0066DD',
          paddingBottom: 40,
          paddingTop: 4,
          height: 90,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          marginTop: 0,
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

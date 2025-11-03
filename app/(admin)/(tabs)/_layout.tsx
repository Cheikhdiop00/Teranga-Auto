import { Tabs } from 'expo-router';
import { LayoutDashboard, Users, User, AlertCircle, Bell } from 'lucide-react-native';

export default function AdminTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#DCEBFF',
        tabBarStyle: {
          backgroundColor: '#007AFF',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tableau de bord',
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Utilisateurs',
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Signalements',
          tabBarIcon: ({ color, size }) => (
            <AlertCircle color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

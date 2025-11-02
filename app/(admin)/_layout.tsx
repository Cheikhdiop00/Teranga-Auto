import { Stack } from 'expo-router';
import { View } from 'react-native';

import {
  ClientThemeProvider,
  useClientTheme,
} from '@/contexts/ClientThemeContext';

function AdminStack() {
  const { colors } = useClientTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </View>
  );
}

export default function AdminLayout() {
  return (
    <ClientThemeProvider>
      <AdminStack />
    </ClientThemeProvider>
  );
}

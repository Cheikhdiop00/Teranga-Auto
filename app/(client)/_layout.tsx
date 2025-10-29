import { Stack } from 'expo-router';
import { ClientThemeProvider } from '@/contexts/ClientThemeContext';

export default function ClientLayout() {
  return (
    <ClientThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ClientThemeProvider>
  );
}

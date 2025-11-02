import { Stack } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';
import { ClientThemeProvider } from '@/contexts/ClientThemeContext';

const AssistantHeader = ({ navigation, back }: NativeStackHeaderProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
      <View style={styles.headerContent}>
        {back ? (
          <TouchableOpacity
            onPress={navigation.goBack}
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ArrowLeft color="#FFFFFF" size={20} />
          </TouchableOpacity>
        ) : null}
        <Text style={styles.headerTitle}>Assistant IA</Text>
      </View>
    </View>
  );
};

export default function ClientLayout() {
  return (
    <ClientThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="ai-assistant"
          options={{
            header: (props) => <AssistantHeader {...props} />,
          }}
        />
      </Stack>
    </ClientThemeProvider>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#007AFF',
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 44,
  },
  backButton: {
    padding: 6,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

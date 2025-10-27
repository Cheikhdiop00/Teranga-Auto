import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

export default function AdminLayout() {
  return (
    <View style={styles.container}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Fond blanc pour toute la zone admin
  },
});

import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, InteractionManager } from 'react-native';
import { useRouter, useRootNavigationState } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!navigationState?.key || loading) {
      return;
    }

    const task = InteractionManager.runAfterInteractions(() => {
      if (!profile) {
        router.replace('/(mechanic)/(tabs)');
        return;
      }

      switch (profile.user_type) {
        case 'client':
          router.replace('/(client)/(tabs)');
          break;
        case 'mechanic':
          router.replace('/(mechanic)/(tabs)');
          break;
        case 'admin':
          router.replace('/(admin)/(tabs)');
          break;
      }
    });

    return () => task.cancel();
  }, [navigationState?.key, profile, loading, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

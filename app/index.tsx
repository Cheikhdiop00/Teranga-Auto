import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, InteractionManager } from 'react-native';
import { useRouter, useRootNavigationState } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    console.log('Index - Navigation state:', navigationState?.key);
    console.log('Index - Loading:', loading);
    console.log('Index - Profile:', profile?.user_type);
    
    if (!navigationState?.key || loading) {
      return;
    }

    const task = InteractionManager.runAfterInteractions(() => {
      if (!profile) {
        // Rediriger vers la page de connexion si non connecté
        console.log('Index - No profile, redirecting to login');
        router.replace('/auth/login');
        return;
      }

      // Rediriger vers le tableau de bord approprié selon le type d'utilisateur
      console.log('Index - Redirecting based on user_type:', profile.user_type);
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
        default:
          // Si type inconnu, rediriger vers login
          router.replace('/auth/login');
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

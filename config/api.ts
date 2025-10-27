// Configuration centralisée de l'API
// Résout automatiquement l'IP LAN quand on utilise Expo Go sur appareil physique
import Constants from 'expo-constants';

const DEFAULT_PORT = 4000;

const getApiUrl = () => {
  // 1) Priorité à la variable d'environnement Expo (sans /api)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 2) Déduire l'IP depuis l'URL du dev server Expo (utile pour Expo Go sur appareil)
  //    ex: hostUri = "192.168.1.10:19000"
  try {
    const hostUri: string | undefined = (Constants as any)?.expoConfig?.hostUri || (Constants as any)?.manifest2?.extra?.expoClient?.hostUri;
    if (hostUri && hostUri.includes(':')) {
      const host = hostUri.split(':')[0];
      if (host && /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
        return `http://${host}:${DEFAULT_PORT}`;
      }
    }
  } catch {}

  // 3) Valeur de secours: remplacez par l'IP de votre PC si nécessaire
  return 'http://192.168.1.123:4000';
};

export const API_URL = getApiUrl();
export const API_BASE_URL = `${API_URL}/api`;

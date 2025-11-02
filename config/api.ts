// Configuration centralisée de l'API
// Résout automatiquement l'IP LAN quand on utilise Expo Go sur appareil physique
import Constants from 'expo-constants';

const DEFAULT_PORT = 3000;

const getApiUrl = () => {
  // 1) Priorité à la variable d'environnement Expo (sans /api)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 2) IP fixe du serveur backend
  // Note: La détection automatique est désactivée car elle peut détecter
  // l'IP du dev server Expo au lieu de l'IP du backend
  return 'http://192.168.1.27:3000';
};

export const API_URL = getApiUrl();
export const API_BASE_URL = `${API_URL}/api`;

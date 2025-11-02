// config/app.ts
export const APP_CONFIG = {
  // Mode de fonctionnement : 'auto' pour basculer automatiquement, 'api' pour forcer l'API, 'local' pour forcer le local
  MODE: 'auto', // Basculera automatiquement selon la disponibilité

  // Configuration API - IP de votre serveur backend
  API_BASE: 'http://192.168.1.7/api', // Votre IP réseau pour le mobile

  // Configuration des services
  USE_LOCAL_SERVICES: false, // Sera déterminé automatiquement

  // Autres configurations
  ENABLE_ANALYTICS: false,
  ENABLE_PUSH_NOTIFICATIONS: true,
};

// Configuration centralisée de l'API
// Pour Android Emulator: 10.0.2.2
// Pour iOS Simulator: localhost
// Pour appareil physique: utilisez l'IP locale de votre ordinateur (ex: 192.168.1.100)

const getApiUrl = () => {
  // Si une variable d'environnement est définie, l'utiliser
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  // Sinon, utiliser l'URL par défaut selon la plateforme
  // Pour Android Emulator: 10.0.2.2
  // Pour appareil physique: utilise l'IP locale de votre machine
  return 'http://192.168.1.51:3000';
};

export const API_URL = getApiUrl();
export const API_BASE_URL = `${API_URL}/api`;

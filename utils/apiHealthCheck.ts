// utils/apiHealthCheck.ts
import { APP_CONFIG } from '@/config/app';

export interface ApiHealthResult {
  isAvailable: boolean;
  responseTime?: number;
  error?: string;
}

/**
 * Teste la disponibilité de l'API backend
 * @param timeout Timeout en millisecondes (défaut: 5000ms)
 * @returns Résultat du test de santé
 */
export async function checkApiHealth(timeout: number = 5000): Promise<ApiHealthResult> {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(`${APP_CONFIG.API_BASE}/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        isAvailable: true,
        responseTime,
      };
    } else {
      return {
        isAvailable: false,
        responseTime,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime;

    // Network errors or timeouts
    if (error.name === 'AbortError') {
      return {
        isAvailable: false,
        responseTime,
        error: 'Timeout: API response took too long',
      };
    }

    return {
      isAvailable: false,
      responseTime,
      error: error.message || 'Network error',
    };
  }
}

/**
 * Détermine automatiquement si utiliser l'API ou les services locaux
 * @returns true si l'API est disponible, false sinon
 */
export async function shouldUseApi(): Promise<boolean> {
  // Si le mode est forcé à 'local', toujours utiliser local
  if (APP_CONFIG.MODE === 'local') {
    return false;
  }

  // Si le mode est forcé à 'api', toujours essayer l'API
  if (APP_CONFIG.MODE === 'api') {
    return true;
  }

  // Mode 'auto': tester la disponibilité de l'API
  try {
    const healthCheck = await checkApiHealth(3000); // 3 secondes timeout
    return healthCheck.isAvailable;
  } catch (error) {
    console.warn('Erreur lors du test de santé API:', error);
    return false; // En cas d'erreur, basculer vers local
  }
}

/**
 * Wrapper pour les appels API avec fallback automatique
 * @param apiCall Fonction qui fait l'appel API
 * @param fallbackCall Fonction de fallback (services locaux)
 * @returns Résultat de l'appel API ou du fallback
 */
export async function apiCallWithFallback<T>(
  apiCall: () => Promise<T>,
  fallbackCall: () => Promise<T>
): Promise<T> {
  const useApi = await shouldUseApi();

  if (useApi) {
    try {
      console.log('🌐 Tentative d\'appel API...');
      return await apiCall();
    } catch (error) {
      console.warn('⚠️ Échec appel API, basculement vers services locaux:', error);
      return await fallbackCall();
    }
  } else {
    console.log('🏠 Utilisation des services locaux');
    return await fallbackCall();
  }
}

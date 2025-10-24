import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/config/api';

// Configuration de l'API
const API_URL = API_BASE_URL;

// Helper pour les appels API
async function apiCall(endpoint: string, options: RequestInit = {}) {
  try {
    const token = await AsyncStorage.getItem('authToken');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('API Call:', `${API_URL}${endpoint}`);
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    console.log('API Response status:', response.status);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Erreur réseau' }));
      console.error('API Error:', error);
      throw new Error(error.message || 'Erreur serveur');
    }

    const data = await response.json();
    console.log('API Response data:', data);
    return data;
  } catch (error) {
    console.error('API Call failed:', error);
    throw error;
  }
}

// API Client pour remplacer les appels MongoDB directs
export const api = {
  // Profiles
  profiles: {
    find: async (query: any = {}) => {
      return apiCall('/profiles', {
        method: 'POST',
        body: JSON.stringify({ action: 'find', query }),
      });
    },
    
    findOne: async (query: any) => {
      return apiCall('/profiles', {
        method: 'POST',
        body: JSON.stringify({ action: 'findOne', query }),
      });
    },
    
    updateOne: async (filter: any, update: any) => {
      return apiCall('/profiles', {
        method: 'PUT',
        body: JSON.stringify({ filter, update }),
      });
    },
    
    countDocuments: async (query: any = {}) => {
      return apiCall('/profiles/count', {
        method: 'POST',
        body: JSON.stringify({ query }),
      });
    },
  },

  // Services
  services: {
    find: async (query: any = {}) => {
      return apiCall('/services', {
        method: 'POST',
        body: JSON.stringify({ action: 'find', query }),
      });
    },
    
    findOne: async (query: any) => {
      return apiCall('/services', {
        method: 'POST',
        body: JSON.stringify({ action: 'findOne', query }),
      });
    },
    
    updateOne: async (filter: any, update: any) => {
      return apiCall('/services', {
        method: 'PUT',
        body: JSON.stringify({ filter, update }),
      });
    },
    
    countDocuments: async (query: any = {}) => {
      return apiCall('/services/count', {
        method: 'POST',
        body: JSON.stringify({ query }),
      });
    },
  },

  // Admin
  admin: {
    stats: async () => {
      return apiCall('/admin/stats', {
        method: 'GET',
      });
    },
    users: async () => {
      return apiCall('/admin/users', {
        method: 'GET',
      });
    },
    mechanics: async () => {
      return apiCall('/admin/mechanics', {
        method: 'GET',
      });
    },
    clients: async () => {
      return apiCall('/admin/clients', {
        method: 'GET',
      });
    },
  },

  // Reports
  reports: {
    countDocuments: async (query: any = {}) => {
      return apiCall('/reports/count', {
        method: 'POST',
        body: JSON.stringify({ query }),
      });
    },
  },

  // Mechanics
  mechanics: {
    list: async () => {
      return apiCall('/mechanics', {
        method: 'GET',
      });
    },
    nearby: async (lat: number, lng: number, radiusKm: number = 10) => {
      return apiCall(`/mechanics/nearby?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}`, {
        method: 'GET',
      });
    },
  },
};

// Pour la compatibilité avec l'ancien code
export async function getCollection(collectionName: string) {
  // Retourne un objet qui simule l'interface MongoDB
  return {
    find: (query: any = {}) => ({
      sort: (sortOptions: any) => ({
        limit: (limitValue: number) => ({
          toArray: async () => {
            const response = await apiCall(`/${collectionName}`, {
              method: 'POST',
              body: JSON.stringify({
                action: 'find',
                query,
                sort: sortOptions,
                limit: limitValue,
              }),
            });
            return response.data || [];
          },
        }),
        toArray: async () => {
          const response = await apiCall(`/${collectionName}`, {
            method: 'POST',
            body: JSON.stringify({
              action: 'find',
              query,
              sort: sortOptions,
            }),
          });
          return response.data || [];
        },
      }),
      toArray: async () => {
        const response = await apiCall(`/${collectionName}`, {
          method: 'POST',
          body: JSON.stringify({
            action: 'find',
            query,
          }),
        });
        return response.data || [];
      },
    }),
    
    findOne: async (query: any) => {
      const response = await apiCall(`/${collectionName}`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'findOne',
          query,
        }),
      });
      return response.data || null;
    },
    
    updateOne: async (filter: any, update: any) => {
      return apiCall(`/${collectionName}`, {
        method: 'PUT',
        body: JSON.stringify({ filter, update }),
      });
    },
    
    countDocuments: async (query: any = {}) => {
      const response = await apiCall(`/${collectionName}/count`, {
        method: 'POST',
        body: JSON.stringify({ query }),
      });
      return response.count || 0;
    },
  };
}

// Stockage local pour la persistance des données
export const storage = {
  getItem: AsyncStorage.getItem,
  setItem: AsyncStorage.setItem,
  removeItem: AsyncStorage.removeItem,
};
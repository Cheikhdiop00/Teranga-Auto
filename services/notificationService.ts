import { API_BASE_URL } from '../config/api';

// Type pour les notifications du backend
export interface NotificationFromAPI {
  _id: string;
  title: string;
  content: string;
  type?: string;
  read: boolean;
  sentAt: string;
  createdAt: string;
  updatedAt: string;
}

// Type pour les notifications dans l'UI
export interface NotificationUI {
  id: string;
  _id: string;
  title: string;
  content: string;
  type?: string;
  read: boolean;
  notificationType: 'info' | 'warning' | 'error' | 'success';
  date: Date;
  sentAt: string;
  createdAt: string;
  updatedAt: string;
}

// Alias pour la rétrocompatibilité
export type NotificationType = NotificationUI;

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    totalPages: number;
    unreadCount: number;
  };
}

export const getNotifications = async (page: number = 1, limit: number = 10): Promise<PaginatedResponse<NotificationFromAPI>> => {
  try {
    console.log(`Fetching notifications from: ${API_BASE_URL}/notifications?page=${page}&limit=${limit}`);
    
    const token = await (await import('@react-native-async-storage/async-storage')).default.getItem('authToken');
    
    if (!token) {
      console.error('No authentication token found');
      throw new Error('Authentication required');
    }
    
    const response = await fetch(
      `${API_BASE_URL}/notifications?page=${page}&limit=${limit}`, 
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      // Graceful fallback to prevent UI error loops
      if (response.status === 404 || response.status === 401) {
        return {
          data: [],
          pagination: { total: 0, page, totalPages: 0, unreadCount: 0 },
        };
      }
      const errorText = await response.text();
      console.warn(`Failed to fetch notifications: ${response.status} ${response.statusText}`, errorText);
      return { data: [], pagination: { total: 0, page, totalPages: 0, unreadCount: 0 } };
    }

    const data = await response.json();
    console.log('Received notifications:', data);
    return data;
  } catch {
    // Prevent throwing to avoid repeated retries/spam
    return { data: [], pagination: { total: 0, page, totalPages: 0, unreadCount: 0 } };
  }
};

export const getUnreadCount = async (): Promise<number> => {
  try {
    console.log(`Fetching unread count from: ${API_BASE_URL}/notifications/unread/count`);
    
    const token = await (await import('@react-native-async-storage/async-storage')).default.getItem('authToken');
    
    if (!token) {
      console.error('No authentication token found');
      return 0; // Retourner 0 plutôt que de lancer une erreur pour éviter les boucles de chargement
    }
    
    const response = await fetch(
      `${API_BASE_URL}/notifications/unread/count`, 
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to fetch unread count: ${response.status} ${response.statusText}`, errorText);
      return 0; // Retourner 0 plutôt que de lancer une erreur
    }

    const data = await response.json();
    console.log('Received unread count:', data);
    return data.count || 0;
  } catch (error: unknown) {
    console.error('Error in getUnreadCount:', error);
    return 0; // En cas d'erreur, retourner 0
  }
};

export const markAsRead = async (id: string): Promise<NotificationUI> => {
  try {
    console.log(`Marking notification ${id} as read at: ${API_BASE_URL}/notifications/${id}/read`);
    
    const token = await (await import('@react-native-async-storage/async-storage')).default.getItem('authToken');
    
    if (!token) {
      console.error('No authentication token found');
      throw new Error('Authentication required');
    }
    
    const response = await fetch(
      `${API_BASE_URL}/notifications/${id}/read`, 
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to mark notification as read: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Failed to mark notification as read: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Notification marked as read:', data);
    
    // Convertir la réponse en format NotificationUI
    return {
      ...data,
      id: data._id || id,
      notificationType: (data.type === 'success' || data.type === 'warning' || data.type === 'error') 
        ? data.type 
        : 'info',
      date: new Date(data.sentAt || data.createdAt || Date.now())
    };
  } catch (error: unknown) {
    console.error('Error in markAsRead:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Error marking notification as read: ${errorMessage}`);
  }
};

export const markAllAsRead = async (): Promise<void> => {
  try {
    console.log(`Marking all notifications as read at: ${API_BASE_URL}/notifications/read-all`);
    
    const token = await (await import('@react-native-async-storage/async-storage')).default.getItem('authToken');
    
    if (!token) {
      console.error('No authentication token found');
      throw new Error('Authentication required');
    }
    
    const response = await fetch(
      `${API_BASE_URL}/notifications/read-all`, 
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to mark all notifications as read: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Failed to mark all notifications as read: ${response.status} ${response.statusText}`);
    }
    
    console.log('All notifications marked as read successfully');
  } catch (error: unknown) {
    console.error('Error in markAllAsRead:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Error marking all notifications as read: ${errorMessage}`);
  }
};

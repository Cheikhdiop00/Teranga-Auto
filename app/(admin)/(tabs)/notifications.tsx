import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { getNotifications, markAsRead, markAllAsRead, NotificationUI as NotificationType } from '../../../services/notificationService';

// Type pour les notifications avec propriétés UI
type NotificationWithUI = NotificationType;

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationWithUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const loadNotifications = useCallback(async (pageNumber = 1, isRefreshing = false) => {
    try {
      console.log(`Loading notifications page ${pageNumber}, refreshing: ${isRefreshing}`);
      
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await getNotifications(pageNumber, limit);
      
      // Vérifier si la réponse contient les données attendues
      if (!response || !response.data || !Array.isArray(response.data)) {
        console.error('Invalid response format:', response);
        throw new Error('Invalid response format from server');
      }
      
      // Convertir les données de l'API en format attendu par le composant
      const newNotifications = response.data
        .filter(notification => notification) // Filtrer les notifications nulles ou non définies
        .map(notification => {
          try {
            // Déterminer le type de notification pour le style
            let notificationType: 'info' | 'warning' | 'error' | 'success' = 'info';
            if (notification.type === 'success' || notification.type === 'warning' || notification.type === 'error') {
              notificationType = notification.type;
            }
            
            // Créer une date à partir de la chaîne ou utiliser la date actuelle
            const notificationDate = notification.sentAt || notification.createdAt;
            const date = notificationDate ? new Date(notificationDate) : new Date();
            
            // Retourner l'objet notification formaté
            return {
              ...notification,
              id: notification._id || `temp-${Math.random().toString(36).substr(2, 9)}`,
              notificationType,
              date,
              // S'assurer que les champs requis sont définis
              title: notification.title || 'Sans titre',
              content: notification.content || '',
              read: !!notification.read,
              sentAt: notification.sentAt || new Date().toISOString(),
              createdAt: notification.createdAt || new Date().toISOString(),
              updatedAt: notification.updatedAt || new Date().toISOString(),
            } as NotificationWithUI;
          } catch (error) {
            console.error('Error processing notification:', notification, error);
            return null;
          }
        })
        .filter(Boolean); // Filtrer les notifications qui n'ont pas pu être traitées

      // Mettre à jour l'état avec les nouvelles notifications (en s'assurant qu'elles ne sont pas null)
      const validNewNotifications = newNotifications.filter((n): n is NotificationWithUI => n !== null);
      
      setNotifications(prev => {
        if (pageNumber === 1) {
          return validNewNotifications;
        } else {
          // Éviter les doublons en utilisant un Set d'IDs
          const existingIds = new Set(prev.map(n => n.id));
          const uniqueNewNotifications = validNewNotifications.filter(n => !existingIds.has(n.id));
          return [...prev, ...uniqueNewNotifications];
        }
      });
      
      // Mettre à jour les métadonnées de pagination
      if (response.pagination) {
        setUnreadCount(prev => response.pagination.unreadCount !== undefined 
          ? response.pagination.unreadCount 
          : prev);
        setTotal(prev => response.pagination.total !== undefined 
          ? response.pagination.total 
          : prev);
        setHasMore(prev => response.pagination.page < response.pagination.totalPages);
      }
      
      setPage(pageNumber);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications(1);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    if (!id) return;
    
    try {
      await markAsRead(id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleRefresh = () => {
    loadNotifications(1, true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadNotifications(page + 1);
    }
  };

  const getTypeColor = (type: 'info' | 'warning' | 'error' | 'success') => {
    switch(type) {
      case 'success': return '#4CAF50';
      case 'warning': return '#FFC107';
      case 'error': return '#F44336';
      case 'info':
      default: 
        return '#2196F3';
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `Il y a ${diffInMinutes} min`;
    } else if (diffInHours < 24) {
      return `Il y a ${diffInHours} h`;
    } else {
      return date.toLocaleDateString('fr-FR');
    }
  };

  const renderNotificationItem = ({ item }: { item: NotificationWithUI }) => {
    if (!item.id) return null; // Ne pas rendre les notifications sans ID
    
    return (
      <TouchableOpacity 
        style={[
          styles.notificationItem, 
          !item.read && styles.unreadNotification,
          { borderLeftColor: getTypeColor(item.notificationType) }
        ]}
        onPress={() => handleMarkAsRead(item.id)}
      >
        <View style={styles.notificationContent}>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          <Text style={styles.notificationMessage}>{item.content}</Text>
          <Text style={styles.notificationDate}>{formatDate(item.date)}</Text>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color="#FFFFFF" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllButton}>
            <Text style={styles.markAllText}>Tout marquer comme lu</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Liste des notifications */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotificationItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#0A1F44']}
            tintColor="#0A1F44"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Bell size={48} color="#CCCCCC" />
              <Text style={styles.emptyText}>Aucune notification</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loading && notifications.length > 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#0A1F44" />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#0A1F44',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    bottom: 16,
    padding: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  markAllButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  markAllText: {
    color: '#FFD700',
    fontSize: 14,
  },
  notificationItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    width: '5%', // 5% de la largeur de l'écran
    minWidth: 50, // Largeur minimale pour éviter que le texte ne devienne illisible
    alignSelf: 'center', // Centrer la carte
  },
  unreadNotification: {
    backgroundColor: '#F8F9FF',
  },
  notificationContent: {
    flex: 1,
    marginRight: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333333',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  notificationDate: {
    fontSize: 12,
    color: '#999999',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF3B30',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999999',
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

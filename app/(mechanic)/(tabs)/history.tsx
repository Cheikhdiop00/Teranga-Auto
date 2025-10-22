import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, SafeAreaView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

// Données factices pour l'historique des missions
const missionHistory = [
  {
    id: '1',
    clientName: 'Jean Dupont',
    service: 'Vidange et filtre à huile',
    date: '15/10/2023',
    amount: '120 €',
    status: 'Terminé',
    rating: 4.5,
    carModel: 'Renault Clio 2019',
    clientAvatar: 'https://randomuser.me/api/portraits/men/1.jpg'
  },
  {
    id: '2',
    clientName: 'Marie Martin',
    service: 'Changement des plaquettes de frein',
    date: '10/10/2023',
    amount: '85 €',
    status: 'Terminé',
    rating: 5,
    carModel: 'Peugeot 208 2020',
    clientAvatar: 'https://randomuser.me/api/portraits/women/1.jpg'
  },
  {
    id: '3',
    clientName: 'Thomas Bernard',
    service: 'Révision complète',
    date: '05/10/2023',
    amount: '250 €',
    status: 'Terminé',
    rating: 4,
    carModel: 'Volkswagen Golf 2021',
    clientAvatar: 'https://randomuser.me/api/portraits/men/2.jpg'
  },
];

// Composant d'une carte de mission
interface Mission {
  id: string;
  clientName: string;
  service: string;
  date: string;
  amount: string;
  status: string;
  rating: number;
  carModel: string;
  clientAvatar: string;
}

const MissionCard = ({ mission }: { mission: Mission }) => (
  <View style={styles.missionCard}>
    <View style={styles.missionHeader}>
      <Image source={{ uri: mission.clientAvatar }} style={styles.avatar} />
      <View style={styles.missionInfo}>
        <Text style={styles.clientName}>{mission.clientName}</Text>
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={16} color="#FFD700" />
          <Text style={styles.ratingText}>{mission.rating}</Text>
        </View>
      </View>
      <Text style={[styles.status, styles.statusCompleted]}>{mission.status}</Text>
    </View>
    
    <View style={styles.serviceInfo}>
      <Text style={styles.serviceTitle}>Service effectué</Text>
      <Text style={styles.serviceName}>{mission.service}</Text>
      <Text style={styles.carModel}>{mission.carModel}</Text>
    </View>
    
    <View style={styles.missionFooter}>
      <Text style={styles.date}>{mission.date}</Text>
      <Text style={styles.amount}>{mission.amount}</Text>
    </View>
  </View>
);

export default function MechanicHistoryScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [missions, setMissions] = useState(missionHistory);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text === '') {
      setMissions(missionHistory);
    } else {
      const filtered = missionHistory.filter(mission => 
        mission.clientName.toLowerCase().includes(text.toLowerCase()) ||
        mission.service.toLowerCase().includes(text.toLowerCase()) ||
        mission.carModel.toLowerCase().includes(text.toLowerCase())
      );
      setMissions(filtered);
    }
  };

  const handleDeleteMission = (id: string) => {
    setMissions(prevMissions => prevMissions.filter(mission => mission.id !== id));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Historique</Text>
        <View style={styles.headerRight}>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher..."
              value={searchQuery}
              onChangeText={handleSearch}
              placeholderTextColor="#999"
            />
            {searchQuery === '' ? (
              <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
            ) : (
              <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <FlatList
        data={missions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.missionCardContainer}>
            <MissionCard mission={item} />
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => handleDeleteMission(item.id)}
            >
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color="#DDD" />
            <Text style={styles.emptyStateText}>Aucune mission trouvée</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  headerContent: {
    width: '100%',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    paddingHorizontal: 10,
    height: 34,
    width: 160,
    alignSelf: 'flex-end',
  },
  searchIcon: {
    marginRight: 4,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  searchInput: {
    flex: 1,
    height: 34,
    color: '#FFFFFF',
    paddingVertical: 0,
    paddingHorizontal: 6,
    fontSize: 13,
  },
  clearButton: {
    padding: 2,
  },
  missionCardContainer: {
    position: 'relative',
  },
  deleteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#0A1F44',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 10,
  },
  headerRight: {
    flex: 1,
    marginLeft: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  listContent: {
    padding: 12,
    paddingBottom: 24,
    marginTop: -10,
  },
  missionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  missionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  missionInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A1F44',
    marginBottom: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  status: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  statusCompleted: {
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
  },
  serviceInfo: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  serviceTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A1F44',
    marginBottom: 4,
  },
  carModel: {
    fontSize: 14,
    color: '#666',
  },
  missionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: 14,
    color: '#999',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0A1F44',
  },
});

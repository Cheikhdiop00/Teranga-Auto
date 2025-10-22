import { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, TextInput, Image, ImageSourcePropType, ListRenderItem } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SwipeableRow } from '../../../components/SwipeableRow';

// Types
type Conversation = {
  id: string;
  userName: string;
  lastMessage: string;
  time: string;
  unread: number;
  avatar: string;
};

type Message = {
  id: string;
  text: string;
  isMe: boolean;
  time: string;
};

type ConversationItemProps = {
  item: Conversation;
  onPress: () => void;
};

type MessageBubbleProps = {
  isMe: boolean;
  message: string;
  time: string;
};

// Données factices pour les conversations
const mockConversations: Conversation[] = [
  {
    id: '1',
    userName: 'Jean Dupont',
    lastMessage: 'Bonjour, pourriez-vous me donner un devis ?',
    time: '10:30',
    unread: 2,
    avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
  },
  {
    id: '2',
    userName: 'Marie Martin',
    lastMessage: 'Merci pour votre aide !',
    time: 'Hier',
    unread: 0,
    avatar: 'https://randomuser.me/api/portraits/women/1.jpg',
  },
  {
    id: '3',
    userName: 'Auto Service 24/7',
    lastMessage: 'Votre rendez-vous est confirmé pour demain',
    time: 'Lun',
    unread: 0,
    avatar: 'https://randomuser.me/api/portraits/lego/1.jpg',
  },
];

// Composant d'un élément de conversation
const ConversationItem: React.FC<ConversationItemProps> = ({ item, onPress }) => (
  <TouchableOpacity style={styles.conversationItem} onPress={onPress}>
    <Image source={{ uri: item.avatar }} style={styles.avatar} />
    <View style={styles.conversationContent}>
      <View style={styles.conversationHeader}>
        <Text style={styles.userName}>{item.userName}</Text>
        <Text style={styles.time}>{item.time}</Text>
      </View>
      <Text 
        style={[styles.lastMessage, item.unread > 0 && styles.unreadMessage]}
        numberOfLines={1}
      >
        {item.lastMessage}
      </Text>
      {item.unread > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadCount}>{item.unread}</Text>
        </View>
      )}
    </View>
  </TouchableOpacity>
);

// Composant d'un message
const MessageBubble: React.FC<MessageBubbleProps> = ({ isMe, message, time }) => (
  <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
    <Text style={isMe ? styles.myMessageText : styles.theirMessageText}>
      {message}
    </Text>
    <Text style={styles.messageTime}>{time}</Text>
  </View>
);

export default function MechanicMessagesScreen() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Implémentez ici la logique de recherche si nécessaire
  };

  // Messages factices pour la conversation sélectionnée
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'Bonjour, pourriez-vous me donner un devis ?', isMe: false, time: '10:30' },
    { id: '2', text: 'Bien sûr, de quel type de réparation avez-vous besoin ?', isMe: true, time: '10:32' },
    { id: '3', text: 'J\'ai un problème de freins qui grincent.', isMe: false, time: '10:33' },
  ]);

  const handleDeleteMessage = (messageId: string) => {
    setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId));
  };

  const renderMessageItem: ListRenderItem<Message> = ({ item }) => (
    <SwipeableRow 
      onDelete={() => handleDeleteMessage(item.id)}
      enabled={item.isMe} // Permet le balayage uniquement pour les messages de l'utilisateur
    >
      <MessageBubble 
        isMe={item.isMe} 
        message={item.text} 
        time={item.time} 
      />
    </SwipeableRow>
  );

  const renderConversationItem: ListRenderItem<Conversation> = ({ item }) => (
    <ConversationItem 
      item={item} 
      onPress={() => setSelectedConversation(item)} 
    />
  );

  const handleSendMessage = () => {
    if (message.trim()) {
      const newMessage = {
        id: Date.now().toString(),
        text: message,
        isMe: true,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages([...messages, newMessage]);
      setMessage('');
    }
  };

  if (selectedConversation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.chatHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setSelectedConversation(null)}
          >
            <Ionicons name="arrow-back" size={24} color="#0A1F44" />
          </TouchableOpacity>
          <Image 
            source={{ uri: selectedConversation.avatar }} 
            style={styles.chatAvatar} 
          />
          <Text style={styles.chatUserName}>{selectedConversation.userName}</Text>
        </View>

        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          inverted={false}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.messageInput}
            placeholder="Tapez votre message..."
            value={message}
            onChangeText={setMessage}
            multiline
          />
          <TouchableOpacity 
            style={styles.sendButton}
            onPress={handleSendMessage}
            disabled={!message.trim()}
          >
            <Ionicons 
              name="send" 
              size={20} 
              color={message.trim() ? '#0A1F44' : '#999'} 
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
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
              <Ionicons name="search" size={18} color="rgba(255, 255, 255, 0.7)" style={styles.searchIcon} />
            ) : (
              <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={18} color="rgba(255, 255, 255, 0.7)" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <FlatList
        data={mockConversations}
        keyExtractor={(item) => item.id}
        renderItem={renderConversationItem}
        style={styles.conversationList}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // En-tête
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
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  headerRight: {
    flex: 1,
    marginLeft: 16,
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
  searchInput: {
    flex: 1,
    height: 34,
    color: '#FFFFFF',
    paddingVertical: 0,
    paddingHorizontal: 6,
    fontSize: 13,
  },
  searchIcon: {
    marginRight: 4,
  },
  clearButton: {
    padding: 2,
  },
  
  // Liste des conversations
  conversationList: {
    flex: 1,
    marginTop: -10,
    paddingHorizontal: 12,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: '#f0f0f0', // Couleur de fond par défaut
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A1F44',
  },
  time: {
    fontSize: 12,
    color: '#999',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  unreadMessage: {
    color: '#0A1F44',
    fontWeight: '500',
  },
  unreadBadge: {
    position: 'absolute',
    right: 0,
    top: '50%',
    backgroundColor: '#0A1F44',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateY: -10 }],
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // Bouton de retour
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  // Vue de discussion
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 15,
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
  chatAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  chatUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 0,
  },
  messagesContent: {
    paddingHorizontal: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginVertical: 4,
    backgroundColor: '#FFFFFF',
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#0A1F44',
    borderBottomRightRadius: 4,
    marginRight: 16,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F0F0',
    borderBottomLeftRadius: 4,
    marginLeft: 16,
  },
  myMessageText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  theirMessageText: {
    color: '#333333',
    fontSize: 15,
  },
  messageTime: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    marginRight: 8,
    fontSize: 15,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

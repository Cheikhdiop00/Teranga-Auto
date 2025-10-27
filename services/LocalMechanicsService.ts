// services/LocalMechanicsService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Mechanic {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  specialties: string[];
  is_available: boolean;
  rating_average: number;
  rating_count: number;
  latitude: number;
  longitude: number;
  photo_url?: string;
  id_card_number?: string;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
}

interface ServiceRequest {
  id: string;
  client_id: string;
  mechanic_id?: string;
  service_type: string;
  description: string;
  status: 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  latitude: number;
  longitude: number;
  address: string;
  scheduled_date?: string;
  estimated_cost?: number;
  final_cost?: number;
  created_at: string;
  updated_at: string;
  client?: {
    first_name: string;
    last_name: string;
    phone: string;
  };
  mechanic?: {
    first_name: string;
    last_name: string;
    phone: string;
    specialties: string[];
  };
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  message_type: 'TEXT' | 'IMAGE' | 'LOCATION';
  is_read: boolean;
  created_at: string;
}

interface Conversation {
  id: string;
  client_id: string;
  mechanic_id: string;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
  created_at: string;
  client?: {
    first_name: string;
    last_name: string;
    phone: string;
  };
  mechanic?: {
    first_name: string;
    last_name: string;
    phone: string;
    specialties: string[];
  };
}

// Données mockées pour les mécaniciens
const MOCK_MECHANICS: Mechanic[] = [
  {
    id: '3',
    user_id: '3',
    first_name: 'Mamadou',
    last_name: 'Diallo',
    phone: '+221771234569',
    address: 'Dakar, Senegal',
    specialties: ['Réparation moteur', 'Freins', 'Électricité'],
    is_available: true,
    rating_average: 4.5,
    rating_count: 25,
    latitude: 14.7167,
    longitude: -17.4677,
    is_blocked: false,
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
  },
  {
    id: '4',
    user_id: '4',
    first_name: 'Ibrahima',
    last_name: 'Sow',
    phone: '+221771234570',
    address: 'Dakar, Senegal',
    specialties: ['Climatisation', 'Carrosserie', 'Peinture'],
    is_available: true,
    rating_average: 4.2,
    rating_count: 18,
    latitude: 14.7167,
    longitude: -17.4677,
    is_blocked: false,
    created_at: '2024-01-04T00:00:00Z',
    updated_at: '2024-01-04T00:00:00Z',
  },
  {
    id: '5',
    user_id: '5',
    first_name: 'Fatou',
    last_name: 'Ndiaye',
    phone: '+221771234571',
    address: 'Dakar, Senegal',
    specialties: ['Révision', 'Vidange', 'Filtres'],
    is_available: false,
    rating_average: 4.8,
    rating_count: 32,
    latitude: 14.7167,
    longitude: -17.4677,
    is_blocked: false,
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-05T00:00:00Z',
  },
  {
    id: '6',
    user_id: '6',
    first_name: 'Amadou',
    last_name: 'Ba',
    phone: '+221771234572',
    address: 'Dakar, Senegal',
    specialties: ['Pneumatiques', 'Jantes', 'Suspension'],
    is_available: true,
    rating_average: 4.3,
    rating_count: 15,
    latitude: 14.7167,
    longitude: -17.4677,
    is_blocked: false,
    created_at: '2024-01-06T00:00:00Z',
    updated_at: '2024-01-06T00:00:00Z',
  },
];

const MOCK_SERVICE_REQUESTS: ServiceRequest[] = [
  {
    id: '1',
    client_id: '2',
    mechanic_id: '3',
    service_type: 'Réparation moteur',
    description: 'Problème de démarrage du moteur, bruit suspect',
    status: 'IN_PROGRESS',
    latitude: 14.7167,
    longitude: -17.4677,
    address: 'Dakar, Senegal',
    scheduled_date: '2024-01-15T10:00:00Z',
    estimated_cost: 50000,
    created_at: '2024-01-10T08:00:00Z',
    updated_at: '2024-01-12T09:00:00Z',
    client: {
      first_name: 'Alioune',
      last_name: 'Ngom',
      phone: '+221771234568',
    },
    mechanic: {
      first_name: 'Mamadou',
      last_name: 'Diallo',
      phone: '+221771234569',
      specialties: ['Réparation moteur', 'Freins', 'Électricité'],
    },
  },
];

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: '1',
    client_id: '2',
    mechanic_id: '3',
    last_message: 'Bonjour, je suis disponible pour votre réparation',
    last_message_time: '2024-01-12T09:00:00Z',
    unread_count: 1,
    created_at: '2024-01-10T08:00:00Z',
    client: {
      first_name: 'Alioune',
      last_name: 'Ngom',
      phone: '+221771234568',
    },
    mechanic: {
      first_name: 'Mamadou',
      last_name: 'Diallo',
      phone: '+221771234569',
      specialties: ['Réparation moteur', 'Freins', 'Électricité'],
    },
  },
];

class LocalMechanicsService {
  private static instance: LocalMechanicsService;

  static getInstance(): LocalMechanicsService {
    if (!LocalMechanicsService.instance) {
      LocalMechanicsService.instance = new LocalMechanicsService();
    }
    return LocalMechanicsService.instance;
  }

  async getMechanics(): Promise<Mechanic[]> {
    // Simulation d'un délai réseau
    await new Promise(resolve => setTimeout(resolve, 800));
    return [...MOCK_MECHANICS];
  }

  async getMechanicById(id: string): Promise<Mechanic | null> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return MOCK_MECHANICS.find(m => m.id === id) || null;
  }

  async getServiceRequests(clientId?: string, mechanicId?: string): Promise<ServiceRequest[]> {
    await new Promise(resolve => setTimeout(resolve, 600));

    let requests = [...MOCK_SERVICE_REQUESTS];

    if (clientId) {
      requests = requests.filter(r => r.client_id === clientId);
    }

    if (mechanicId) {
      requests = requests.filter(r => r.mechanic_id === mechanicId);
    }

    return requests;
  }

  async createServiceRequest(requestData: {
    client_id: string;
    service_type: string;
    description: string;
    latitude: number;
    longitude: number;
    address: string;
    scheduled_date?: string;
  }): Promise<ServiceRequest> {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const newRequest: ServiceRequest = {
      id: (MOCK_SERVICE_REQUESTS.length + 1).toString(),
      ...requestData,
      status: 'PENDING',
      estimated_cost: Math.floor(Math.random() * 100000) + 20000, // Coût aléatoire entre 20k et 120k
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      client: {
        first_name: 'Alioune',
        last_name: 'Ngom',
        phone: '+221771234568',
      },
    };

    MOCK_SERVICE_REQUESTS.push(newRequest);
    return newRequest;
  }

  async updateServiceRequest(id: string, updates: Partial<ServiceRequest>): Promise<ServiceRequest | null> {
    await new Promise(resolve => setTimeout(resolve, 700));

    const requestIndex = MOCK_SERVICE_REQUESTS.findIndex(r => r.id === id);
    if (requestIndex === -1) return null;

    MOCK_SERVICE_REQUESTS[requestIndex] = {
      ...MOCK_SERVICE_REQUESTS[requestIndex],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    return MOCK_SERVICE_REQUESTS[requestIndex];
  }

  async getConversations(userId: string): Promise<Conversation[]> {
    await new Promise(resolve => setTimeout(resolve, 500));

    return MOCK_CONVERSATIONS.filter(c =>
      c.client_id === userId || c.mechanic_id === userId
    );
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    await new Promise(resolve => setTimeout(resolve, 400));

    // Retourner des messages mockés pour cette conversation
    return [
      {
        id: '1',
        conversation_id: conversationId,
        sender_id: '3',
        receiver_id: '2',
        message: 'Bonjour, je suis disponible pour votre réparation moteur',
        message_type: 'TEXT',
        is_read: true,
        created_at: '2024-01-12T09:00:00Z',
      },
      {
        id: '2',
        conversation_id: conversationId,
        sender_id: '2',
        receiver_id: '3',
        message: 'Parfait, quand pouvez-vous venir ?',
        message_type: 'TEXT',
        is_read: true,
        created_at: '2024-01-12T09:05:00Z',
      },
      {
        id: '3',
        conversation_id: conversationId,
        sender_id: '3',
        receiver_id: '2',
        message: 'Je peux venir demain matin vers 10h',
        message_type: 'TEXT',
        is_read: false,
        created_at: '2024-01-12T09:10:00Z',
      },
    ];
  }

  async sendMessage(conversationId: string, senderId: string, receiverId: string, message: string): Promise<Message> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const newMessage: Message = {
      id: Date.now().toString(),
      conversation_id: conversationId,
      sender_id: senderId,
      receiver_id: receiverId,
      message,
      message_type: 'TEXT',
      is_read: false,
      created_at: new Date().toISOString(),
    };

    // Mettre à jour la dernière activité de la conversation
    const conversationIndex = MOCK_CONVERSATIONS.findIndex(c => c.id === conversationId);
    if (conversationIndex !== -1) {
      MOCK_CONVERSATIONS[conversationIndex].last_message = message;
      MOCK_CONVERSATIONS[conversationIndex].last_message_time = newMessage.created_at;
      if (senderId !== MOCK_CONVERSATIONS[conversationIndex].client_id) {
        MOCK_CONVERSATIONS[conversationIndex].unread_count++;
      }
    }

    return newMessage;
  }

  // Méthodes pour l'admin
  async blockMechanic(mechanicId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 500));

    const mechanicIndex = MOCK_MECHANICS.findIndex(m => m.id === mechanicId);
    if (mechanicIndex === -1) return false;

    MOCK_MECHANICS[mechanicIndex].is_blocked = true;
    MOCK_MECHANICS[mechanicIndex].updated_at = new Date().toISOString();

    return true;
  }

  async unblockMechanic(mechanicId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 500));

    const mechanicIndex = MOCK_MECHANICS.findIndex(m => m.id === mechanicId);
    if (mechanicIndex === -1) return false;

    MOCK_MECHANICS[mechanicIndex].is_blocked = false;
    MOCK_MECHANICS[mechanicIndex].updated_at = new Date().toISOString();

    return true;
  }
}

export default LocalMechanicsService;
export type { Mechanic, ServiceRequest, Message, Conversation };

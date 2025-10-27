// services/LocalAuthService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  phoneNumber?: string;
  profilePhoto?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Profile {
  id: string;
  user_type: string;
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  photo_url?: string;
  id_card_number?: string;
  specialties?: string[];
  is_available?: boolean;
  rating_average: number;
  rating_count: number;
  latitude: number;
  longitude: number;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
}

// Données mockées
const MOCK_USERS: User[] = [
  {
    id: '1',
    firstName: 'Admin',
    lastName: 'System',
    email: 'admin@gmail.com',
    role: 'ADMIN',
    phoneNumber: '+221771234567',
    status: 'ACTIVE',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    firstName: 'Alioune',
    lastName: 'Ngom',
    email: 'alioune.ngom2@unchk.edu.sn',
    role: 'CLIENT',
    phoneNumber: '+221771234568',
    status: 'ACTIVE',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
  {
    id: '3',
    firstName: 'Mamadou',
    lastName: 'Diallo',
    email: 'mamadou.diallo@example.com',
    role: 'MECANICIEN',
    phoneNumber: '+221771234569',
    status: 'ACTIVE',
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
  },
];

const MOCK_PROFILES: Profile[] = [
  {
    id: '1',
    user_type: 'admin',
    first_name: 'Admin',
    last_name: 'System',
    phone: '+221771234567',
    address: 'Dakar, Senegal',
    rating_average: 0,
    rating_count: 0,
    latitude: 14.7167,
    longitude: -17.4677,
    is_blocked: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    user_type: 'client',
    first_name: 'Alioune',
    last_name: 'Ngom',
    phone: '+221771234568',
    address: 'Dakar, Senegal',
    rating_average: 0,
    rating_count: 0,
    latitude: 14.7167,
    longitude: -17.4677,
    is_blocked: false,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
  {
    id: '3',
    user_type: 'mechanic',
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
];

// Service d'authentification local
class LocalAuthService {
  private static instance: LocalAuthService;

  static getInstance(): LocalAuthService {
    if (!LocalAuthService.instance) {
      LocalAuthService.instance = new LocalAuthService();
    }
    return LocalAuthService.instance;
  }

  async login(email: string, password: string): Promise<{ user: User; token: string; profile: Profile }> {
    // Simulation d'un délai réseau
    await new Promise(resolve => setTimeout(resolve, 1000));

    const user = MOCK_USERS.find(u => u.email === email);
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    // Vérification simple du mot de passe (en production, utiliser bcrypt)
    const validPasswords: { [key: string]: string } = {
      'admin@gmail.com': '12345678',
      'alioune.ngom2@unchk.edu.sn': '123456',
      'mamadou.diallo@example.com': '123456',
    };

    if (password !== validPasswords[email]) {
      throw new Error('Mot de passe incorrect');
    }

    const profile = MOCK_PROFILES.find(p => p.id === user.id);
    if (!profile) {
      throw new Error('Profil non trouvé');
    }

    // Générer un token simple (en production, utiliser JWT)
    const token = `mock_token_${user.id}_${Date.now()}`;

    return { user, token, profile };
  }

  async register(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phoneNumber: string;
    nationalId?: string;
    address: string;
    role: string;
  }): Promise<{ user: User; token: string; profile: Profile }> {
    // Simulation d'un délai réseau
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Vérifier si l'utilisateur existe déjà
    const existingUser = MOCK_USERS.find(u => u.email === userData.email);
    if (existingUser) {
      throw new Error('Cet email est déjà utilisé');
    }

    // Créer un nouvel utilisateur
    const newUser: User = {
      id: (MOCK_USERS.length + 1).toString(),
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      role: userData.role,
      phoneNumber: userData.phoneNumber,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Créer le profil correspondant
    const newProfile: Profile = {
      id: newUser.id,
      user_type: userData.role.toLowerCase(),
      first_name: userData.firstName,
      last_name: userData.lastName,
      phone: userData.phoneNumber,
      address: userData.address,
      id_card_number: userData.nationalId,
      specialties: userData.role === 'MECANICIEN' ? [] : undefined,
      is_available: userData.role === 'MECANICIEN',
      rating_average: 0,
      rating_count: 0,
      latitude: 14.7167,
      longitude: -17.4677,
      is_blocked: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Ajouter aux données mockées (en production, sauvegarder en base)
    MOCK_USERS.push(newUser);
    MOCK_PROFILES.push(newProfile);

    // Générer un token
    const token = `mock_token_${newUser.id}_${Date.now()}`;

    return { user: newUser, token, profile: newProfile };
  }

  async validateToken(token: string): Promise<{ user: User; profile: Profile } | null> {
    // Simulation de validation de token
    await new Promise(resolve => setTimeout(resolve, 500));

    if (!token || !token.startsWith('mock_token_')) {
      return null;
    }

    const userId = token.split('_')[2];
    const user = MOCK_USERS.find(u => u.id === userId);
    const profile = MOCK_PROFILES.find(p => p.id === userId);

    if (!user || !profile) {
      return null;
    }

    return { user, profile };
  }

  // Getters pour les données mockées (utiles pour l'admin)
  getAllUsers(): User[] {
    return [...MOCK_USERS];
  }

  getAllProfiles(): Profile[] {
    return [...MOCK_PROFILES];
  }

  updateProfile(userId: string, updates: Partial<Profile>): Profile | null {
    const profileIndex = MOCK_PROFILES.findIndex(p => p.id === userId);
    if (profileIndex === -1) return null;

    MOCK_PROFILES[profileIndex] = {
      ...MOCK_PROFILES[profileIndex],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    return MOCK_PROFILES[profileIndex];
  }
}

export default LocalAuthService;
export type { User, Profile };

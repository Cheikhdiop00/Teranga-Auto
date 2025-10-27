import React, { createContext, useState, useEffect, useContext } from 'react';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCollection } from '@/lib/supabase';
import { Profile, UserType } from '@/types/database';
import { API_BASE_URL } from '@/config/api';

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  session: { userId: string } | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string, userData: {
    firstName: string;
    lastName: string;
    phone: string;
    address: string;
    userType: UserType;
    specialties?: string[];
    idCardNumber?: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const buildMockProfile = (userType: UserType): Profile => {
  const baseProfile = {
    id: `mock-${userType}`,
    user_type: userType,
    first_name: userType === 'mechanic' ? 'Mécanicien' : userType === 'admin' ? 'Admin' : 'Client',
    last_name: 'Démo',
    phone: '+221000000000',
    address: 'Dakar',
    photo_url: undefined,
    id_card_number: undefined,
    specialties: userType === 'mechanic' ? ['Mécanique générale'] : undefined,
    is_available: userType === 'mechanic',
    rating_average: 4.5,
    rating_count: 12,
    missions_completed: 0,
    latitude: 14.7167,
    longitude: -17.4677,
    is_blocked: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies Profile;

  return baseProfile;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const useMockAuth = process.env.EXPO_PUBLIC_USE_MOCK_AUTH === 'true';
  const mockUserType = (process.env.EXPO_PUBLIC_MOCK_USER_TYPE as UserType) || 'client';
  const mockProfile = buildMockProfile(mockUserType);
  const [session, setSession] = useState<{ userId: string } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(
    useMockAuth ? mockProfile : null,
  );
  const [loading, setLoading] = useState(!useMockAuth);

  useEffect(() => {
    if (useMockAuth) {
      return;
    }
    // Vérifier si l'utilisateur est connecté au démarrage
    checkAuth();
  }, [useMockAuth]);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userId = await AsyncStorage.getItem('userId');
      const userEmail = await AsyncStorage.getItem('userEmail');
      
      if (token && userId) {
        setSession({ userId });
        setUser({ id: userId, email: userEmail || '' });
        loadProfile(userId);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      setLoading(false);
    }
  };

  const loadProfile = async (_userId: string) => {
    if (useMockAuth) {
      setProfile(mockProfile);
      setLoading(false);
      return;
    }
    try {
      const token = await AsyncStorage.getItem('authToken');
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Échec chargement profil' }));
        throw new Error(err.message || 'Échec chargement profil');
      }
      const user = await res.json();
      const mapped: Profile = {
        id: user._id || user.id,
        user_type: user.role === 'ADMIN' ? 'admin' : user.role === 'CLIENT' ? 'client' : 'mechanic',
        first_name: user.firstName || '',
        last_name: user.lastName || '',
        phone: user.phoneNumber || '',
        address: '',
        photo_url: user.profilePhoto,
        id_card_number: undefined,
        specialties: undefined,
        is_available: true,
        rating_average: 0,
        rating_count: 0,
        latitude: 0,
        longitude: 0,
        is_blocked: user.status === 'inactive',
        created_at: user.createdAt || new Date().toISOString(),
        updated_at: user.updatedAt || new Date().toISOString(),
      };
      setProfile(mapped);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    if (useMockAuth) {
      setProfile(mockProfile);
      setLoading(false);
      return;
    }
    // Appel API à votre backend pour l'authentification
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Échec de la connexion' }));
      throw new Error(error.message || 'Échec de la connexion');
    }
    
    const data = await response.json();
    const userId = data.user._id || data.user.id;
    
    await AsyncStorage.setItem('authToken', data.token);
    await AsyncStorage.setItem('userId', userId);
    await AsyncStorage.setItem('userEmail', email);
    
    setSession({ userId });
    setUser({ id: userId, email });
    
    // Utiliser directement les données de l'utilisateur pour créer un profil temporaire
    // En attendant d'implémenter un endpoint dédié pour récupérer le profil complet
    const tempProfile: Profile = {
      id: userId,
      user_type: data.user.role === 'ADMIN' ? 'admin' : data.user.role === 'CLIENT' ? 'client' : 'mechanic',
      first_name: data.user.firstName || '',
      last_name: data.user.lastName || '',
      phone: data.user.phoneNumber || '',
      address: '',
      photo_url: data.user.profilePhoto,
      id_card_number: undefined,
      specialties: undefined,
      is_available: true,
      rating_average: 0,
      rating_count: 0,
      missions_completed: 0,
      latitude: 0,
      longitude: 0,
      is_blocked: false,
      created_at: data.user.createdAt || new Date().toISOString(),
      updated_at: data.user.updatedAt || new Date().toISOString(),
    };
    
    setProfile(tempProfile);
    setLoading(false);
  };

  const signInWithGoogle = async () => {
    if (useMockAuth) {
      setProfile(mockProfile);
      setLoading(false);
      return;
    }
    // Implémentation de l'authentification Google avec votre backend
    throw new Error('Authentification Google non implémentée');
  };

  const signUp = async (
    email: string,
    password: string,
    userData: {
      firstName: string;
      lastName: string;
      phone: string;
      address: string;
      userType: UserType;
      specialties?: string[];
      idCardNumber?: string;
    }
  ) => {
    if (useMockAuth) {
      setProfile({
        ...mockProfile,
        first_name: userData.firstName,
        last_name: userData.lastName,
        user_type: userData.userType,
        specialties: userData.specialties,
        id_card_number: userData.idCardNumber,
        updated_at: new Date().toISOString(),
      });
      setLoading(false);
      return;
    }
    
    // Appel API à votre backend pour l'inscription
    // Mapper les champs du mobile vers l'API serveur
    const payload = {
      email,
      password,
      firstName: userData.firstName,
      lastName: userData.lastName,
      phoneNumber: userData.phone,
      address: userData.address,
      nationalId: userData.idCardNumber,
      role: userData.userType === 'mechanic' ? 'MECANICIEN' : 'CLIENT',
    } as const;

    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Échec de l'inscription" }));
      throw new Error(error.message || "Échec de l'inscription");
    }
    
    const data = await response.json();
    const createdUserId = data?.user?._id || data?.user?.id;
    if (data?.token) {
      await AsyncStorage.setItem('authToken', data.token);
    }
    if (createdUserId) {
      await AsyncStorage.setItem('userId', createdUserId);
    }
    await AsyncStorage.setItem('userEmail', email);
  };

  const signOut = async () => {
    if (useMockAuth) {
      setProfile(mockProfile);
      setLoading(false);
      return;
    }
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('userId');
    await AsyncStorage.removeItem('userEmail');
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (useMockAuth) {
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              ...updates,
              updated_at: new Date().toISOString(),
            }
          : prev,
      );
      return;
    }
    if (!user) throw new Error('Non authentifié');

    try {
      const token = await AsyncStorage.getItem('authToken');
      const body: any = {
        firstName: updates.first_name,
        lastName: updates.last_name,
        phoneNumber: updates.phone,
        profilePhoto: updates.photo_url,
      };
      const res = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Échec mise à jour profil' }));
        throw new Error(err.message || 'Échec mise à jour profil');
      }
      await loadProfile(user.id);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signIn,
        signInWithGoogle,
        signUp,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

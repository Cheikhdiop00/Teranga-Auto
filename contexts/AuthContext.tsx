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
    profilePhoto?: string;
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
      
      console.log('🔐 checkAuth - Token présent:', !!token, 'UserId:', !!userId);
      
      if (token && userId) {
        setSession({ userId });
        setUser({ id: userId, email: userEmail || '' });
        loadProfile(userId);
      } else {
        console.log('❌ Aucun token trouvé - utilisateur non connecté');
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
      console.log('🔍 loadProfile - API_BASE_URL:', API_BASE_URL);
      console.log('🔍 loadProfile - Token présent:', !!token);
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
        address: user.address || '',
        photo_url: user.profilePhoto || undefined,
        id_card_number: user.nationalId,
        specialties: Array.isArray(user.specialties)
          ? user.specialties
          : typeof user.specialty === 'string' && user.specialty
            ? [user.specialty]
            : undefined,
        mechanic_record_id:
          typeof user.mechanic_record_id === 'string'
            ? user.mechanic_record_id
            : typeof user.mechanicId === 'string'
              ? user.mechanicId
              : undefined,
        is_available: user.available !== false,
        rating_average: typeof user.reputation === 'number' ? user.reputation : user.rating_average ?? 0,
        rating_count: typeof user.rating_count === 'number' ? user.rating_count : user.interventionsCount ?? 0,
        missions_completed: typeof user.missions_completed === 'number' ? user.missions_completed : 0,
        latitude: typeof user.latitude === 'number' ? user.latitude : 0,
        longitude: typeof user.longitude === 'number' ? user.longitude : 0,
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
      address: data.user.address || '',
      photo_url: data.user.profilePhoto || undefined,
      id_card_number: data.user.nationalId,
      specialties: Array.isArray(data.user.specialties)
        ? data.user.specialties
        : typeof data.user.specialty === 'string' && data.user.specialty
          ? [data.user.specialty]
          : undefined,
      mechanic_record_id:
        typeof data.user.mechanic_record_id === 'string'
          ? data.user.mechanic_record_id
          : typeof data.user.mechanicId === 'string'
            ? data.user.mechanicId
            : undefined,
      is_available: data.user.available !== false,
      rating_average: typeof data.user.reputation === 'number' ? data.user.reputation : data.user.rating_average ?? 0,
      rating_count: typeof data.user.rating_count === 'number' ? data.user.rating_count : data.user.interventionsCount ?? 0,
      missions_completed: 0,
      latitude: typeof data.user.latitude === 'number' ? data.user.latitude : 0,
      longitude: typeof data.user.longitude === 'number' ? data.user.longitude : 0,
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
      profilePhoto?: string;
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
      specialties: userData.specialties,
      profilePhoto: userData.profilePhoto,
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

    if (createdUserId) {
      setSession({ userId: createdUserId });
      setUser({ id: createdUserId, email });
      const userPayload = data.user ?? {};
      const mappedProfile: Profile = {
        id: createdUserId,
        user_type: userPayload.role === 'ADMIN' ? 'admin' : userPayload.role === 'CLIENT' ? 'client' : 'mechanic',
        first_name: userPayload.firstName || userData.firstName || '',
        last_name: userPayload.lastName || userData.lastName || '',
        phone: userPayload.phoneNumber || userData.phone || '',
        address: userPayload.address || userData.address || '',
        photo_url: userPayload.profilePhoto || userData.profilePhoto || undefined,
        id_card_number: userPayload.nationalId || userData.idCardNumber,
        specialties:
          Array.isArray(userPayload.specialties) && userPayload.specialties.length > 0
            ? userPayload.specialties
            : userData.specialties,
        is_available: true,
        rating_average: userPayload.rating_average ?? 0,
        rating_count: userPayload.rating_count ?? 0,
        missions_completed:
          typeof userPayload.missions_completed === 'number' ? userPayload.missions_completed : 0,
        mechanic_record_id:
          typeof userPayload.mechanic_record_id === 'string'
            ? userPayload.mechanic_record_id
            : userPayload.mechanicId || userPayload.mechanic_id,
        latitude: userPayload.latitude ?? 0,
        longitude: userPayload.longitude ?? 0,
        is_blocked: userPayload.status === 'inactive',
        created_at: userPayload.createdAt || new Date().toISOString(),
        updated_at: userPayload.updatedAt || new Date().toISOString(),
      };
      setProfile(mappedProfile);
    }

    setLoading(false);
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

import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { Linking } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Profile, UserType } from '@/types/database';

interface AuthContextType {
  session: Session | null;
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
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(
    useMockAuth ? mockProfile : null,
  );
  const [loading, setLoading] = useState(!useMockAuth);

  useEffect(() => {
    if (useMockAuth) {
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [useMockAuth]);

  const loadProfile = async (userId: string) => {
    if (useMockAuth) {
      setProfile(mockProfile);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    if (useMockAuth) {
      setProfile(mockProfile);
      setLoading(false);
      return;
    }

    const redirectTo = process.env.EXPO_PUBLIC_SUPABASE_REDIRECT_URL;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo || undefined,
        skipBrowserRedirect: false,
      },
    });

    if (error) throw error;

    if (data?.url) {
      await Linking.openURL(data.url);
    }
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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('Erreur lors de la création du compte');

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      user_type: userData.userType,
      first_name: userData.firstName,
      last_name: userData.lastName,
      phone: userData.phone,
      address: userData.address,
      specialties: userData.specialties,
      id_card_number: userData.idCardNumber,
      is_available: userData.userType === 'mechanic' ? false : undefined,
    });

    if (profileError) throw profileError;
  };

  const signOut = async () => {
    if (useMockAuth) {
      setProfile(mockProfile);
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
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

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) throw error;

    await loadProfile(user.id);
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

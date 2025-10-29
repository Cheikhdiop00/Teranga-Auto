import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'client.theme.mode';

type ClientThemeColors = {
  background: string;
  surface: string;
  surfaceAlt: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentContrast: string;
  border: string;
  overlay: string;
  card: string;
  cardBorder: string;
};

type ClientThemeContextValue = {
  isDarkMode: boolean;
  toggleTheme: () => void;
  setDarkMode: (value: boolean) => void;
  colors: ClientThemeColors;
};

const lightColors: ClientThemeColors = {
  background: '#F5F5F5',
  surface: '#FFFFFF',
  surfaceAlt: '#F9FAFB',
  textPrimary: '#0F172A',
  textSecondary: '#4B5563',
  textMuted: '#6B7280',
  accent: '#007AFF',
  accentContrast: '#FFFFFF',
  border: '#E2E8F0',
  overlay: 'rgba(15, 23, 42, 0.55)',
  card: '#FFFFFF',
  cardBorder: '#E5E7EB',
};

const darkColors: ClientThemeColors = {
  background: '#07070B',
  surface: '#10121A',
  surfaceAlt: '#161B26',
  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5F5',
  textMuted: '#94A3B8',
  accent: '#4DA3FF',
  accentContrast: '#051626',
  border: '#1E293B',
  overlay: 'rgba(8, 11, 19, 0.65)',
  card: '#161B26',
  cardBorder: '#1F2937',
};

const ClientThemeContext = createContext<ClientThemeContextValue | undefined>(
  undefined,
);

export function ClientThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && isMounted) {
          setIsDarkMode(stored === 'dark');
        }
      } catch {
        // Ignore read errors
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const persistPreference = useCallback(async (value: boolean) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, value ? 'dark' : 'light');
    } catch {
      // Ignore persistence errors
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDarkMode((prev) => {
      const next = !prev;
      void persistPreference(next);
      return next;
    });
  }, [persistPreference]);

  const setDarkMode = useCallback(
    (value: boolean) => {
      setIsDarkMode(value);
      void persistPreference(value);
    },
    [persistPreference],
  );

  const colors = useMemo(
    () => (isDarkMode ? darkColors : lightColors),
    [isDarkMode],
  );

  const value = useMemo(
    () => ({ isDarkMode, toggleTheme, setDarkMode, colors }),
    [isDarkMode, toggleTheme, setDarkMode, colors],
  );

  return (
    <ClientThemeContext.Provider value={value}>
      {children}
    </ClientThemeContext.Provider>
  );
}

export function useClientTheme(): ClientThemeContextValue {
  const context = useContext(ClientThemeContext);
  if (!context) {
    throw new Error('useClientTheme must be used within a ClientThemeProvider');
  }
  return context;
}

export type { ClientThemeColors };

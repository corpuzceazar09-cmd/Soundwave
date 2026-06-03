import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

// Safe storage adapter: uses localStorage on web (SSR-safe), AsyncStorage on native
const getStorage = () => {
  if (Platform.OS !== 'web') {
    // Native: use AsyncStorage
    const AsyncStorage =
      require('@react-native-async-storage/async-storage').default;
    return AsyncStorage;
  }
  // Web: use a safe in-memory storage during SSR, then localStorage once mounted
  if (typeof window === 'undefined') {
    // SSR environment — return a no-op storage
    return {
      getItem: (_key: string) => Promise.resolve(null),
      setItem: (_key: string, _value: string) => Promise.resolve(),
      removeItem: (_key: string) => Promise.resolve(),
    };
  }
  // Client-side web — use localStorage
  return {
    getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
    setItem: (key: string, value: string) => {
      localStorage.setItem(key, value);
      return Promise.resolve();
    },
    removeItem: (key: string) => {
      localStorage.removeItem(key);
      return Promise.resolve();
    },
  };
};

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      storage: getStorage(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

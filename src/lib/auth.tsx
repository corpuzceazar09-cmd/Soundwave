import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

export type AppRole = 'Admin' | 'Editor' | 'User';

interface AuthState {
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  session: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

// Check if we're using a placeholder Supabase URL (for dev/demo mode)
const isMockMode = () => {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  return !url || url.includes('placeholder');
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isMockMode()) {
      // In mock mode, don't try to fetch session from Supabase
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) fetchRole(s.user.id);
      else setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        setSession(s);
        if (s) {
          await fetchRole(s.user.id);
        } else {
          setRole(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error || !data) {
        // Default to 'User' if no role is assigned
        setRole('User');
      } else {
        setRole(data.role as AppRole);
      }
    } catch {
      setRole('User');
    } finally {
      setLoading(false);
    }
  };

  // Mock login for demo mode — sets role based on email pattern
  const mockLogin = (email: string) => {
    if (email.includes('admin')) {
      setRole('Admin');
    } else if (email.includes('editor')) {
      setRole('Editor');
    } else {
      setRole('User');
    }
  };

  const signOut = async () => {
    if (!isMockMode()) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ session, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// Export mockLogin separately so the login screen can use it
export const mockLogin = (email: string): AppRole => {
  if (email.includes('admin')) return 'Admin';
  if (email.includes('editor')) return 'Editor';
  return 'User';
};

export { isMockMode };

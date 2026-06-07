import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type AppRole = 'Admin' | 'Editor' | 'User';

interface AuthState {
  session: null;
  role: AppRole | null;
  loading: boolean;
  login: (email: string) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  session: null,
  role: null,
  loading: true,
  login: () => {},
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

// Demo mode — Supabase project is paused, bypass all auth calls
const isMockMode = () => true;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

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
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ session: null, role, loading, login: mockLogin, signOut }}>
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

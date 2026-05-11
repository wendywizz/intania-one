import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import type {AuthUser} from '../models/types';
import * as authService from '../services/authService';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  signedIn: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authService
      .restoreSession()
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signedIn: Boolean(user),
      signIn: async () => {
        setLoading(true);
        try {
          setUser(await authService.login());
        } finally {
          setLoading(false);
        }
      },
      signOut: async () => {
        await authService.logout();
        setUser(null);
      },
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}

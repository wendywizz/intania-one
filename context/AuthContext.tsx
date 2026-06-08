import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import type {AuthUser} from '../models/types';
import * as authService from '../services/authService';
import {registerLoggedInDevice} from '../services/deviceService';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  signedIn: boolean;
  completeWebSignIn: (params: Parameters<typeof authService.completeWebLogin>[0]) => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function registerDeviceInBackground(user: AuthUser | null) {
  if (!user) {
    return;
  }

  registerLoggedInDevice(user).catch((error) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[push] device registration failed', error);
    }
  });
}

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authService
      .restoreSession()
      .then((restoredUser) => {
        setUser(restoredUser);
        registerDeviceInBackground(restoredUser);
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signedIn: Boolean(user),
      completeWebSignIn: async (params) => {
        setLoading(true);
        try {
          const signedInUser = await authService.completeWebLogin(params);
          setUser(signedInUser);
          registerDeviceInBackground(signedInUser);
        } finally {
          setLoading(false);
        }
      },
      signIn: async () => {
        setLoading(true);
        try {
          const signedInUser = await authService.login();
          setUser(signedInUser);
          registerDeviceInBackground(signedInUser);
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

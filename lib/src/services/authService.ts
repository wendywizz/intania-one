import AsyncStorage from '@react-native-async-storage/async-storage';
import {authorize, refresh} from 'react-native-app-auth';
import {AUTH} from '../constants/auth';
import type {AuthUser} from '../models/types';

const config = {
  issuer: AUTH.issuer,
  clientId: AUTH.clientId,
  clientSecret: AUTH.clientSecret,
  redirectUrl: AUTH.redirectUrl,
  scopes: AUTH.scopes,
  serviceConfiguration: {
    authorizationEndpoint: `${AUTH.issuer}/authorize`,
    tokenEndpoint: `${AUTH.issuer}/authorize/token`,
  },
};

async function persistSession(user: AuthUser, refreshToken?: string) {
  await AsyncStorage.multiSet([
    [AUTH.storageKeys.user, JSON.stringify(user)],
    [AUTH.storageKeys.loggedIn, 'true'],
  ]);
  if (refreshToken) {
    await AsyncStorage.setItem(AUTH.storageKeys.refreshToken, refreshToken);
  }
}

async function fetchCurrentUser(accessToken: string): Promise<AuthUser> {
  const response = await fetch(`https://${AUTH.domain}/resource/userinfo`, {
    headers: {Authorization: `Bearer ${accessToken}`},
  });

  if (!response.ok) {
    throw new Error('Unable to fetch user profile');
  }

  return response.json();
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const stored = await AsyncStorage.getItem(AUTH.storageKeys.user);
  return stored ? (JSON.parse(stored) as AuthUser) : null;
}

export async function isLoggedIn() {
  return (await AsyncStorage.getItem(AUTH.storageKeys.loggedIn)) === 'true';
}

export async function login(): Promise<AuthUser> {
  const token = await authorize(config);
  const user = await fetchCurrentUser(token.accessToken);
  await persistSession(user, token.refreshToken);
  return user;
}

export async function restoreSession(): Promise<AuthUser | null> {
  const refreshToken = await AsyncStorage.getItem(AUTH.storageKeys.refreshToken);
  if (!refreshToken) {
    return getCurrentUser();
  }

  try {
    const token = await refresh(config, {refreshToken});
    const user = await fetchCurrentUser(token.accessToken);
    await persistSession(user, token.refreshToken ?? refreshToken);
    return user;
  } catch {
    return getCurrentUser();
  }
}

export async function logout() {
  await AsyncStorage.multiRemove([
    AUTH.storageKeys.user,
    AUTH.storageKeys.refreshToken,
    AUTH.storageKeys.loggedIn,
  ]);
}

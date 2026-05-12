import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import {Platform} from 'react-native';
import {AUTH} from '../constants/auth';
import type {AuthUser} from '../models/types';
import {fetchWithApiDelay} from './api';

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  accessToken?: string;
  refreshToken?: string;
};

WebBrowser.maybeCompleteAuthSession();

function createRandomState() {
  const bytes = new Uint8Array(16);

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getRedirectUrl() {
  if (Platform.OS === 'web') {
    return AUTH.webRedirectUrl;
  }

  return Linking.createURL(AUTH.webRedirectPath.replace(/^\//, ''));
}

async function createAuthorizeUrl() {
  const state = createRandomState();
  const url = new URL(`${AUTH.issuer}${AUTH.endpoints.authorize}`);

  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', AUTH.clientId);
  url.searchParams.set('redirect_uri', getRedirectUrl());
  url.searchParams.set('scope', AUTH.scopes.join(' '));
  url.searchParams.set('state', state);

  await AsyncStorage.setItem(AUTH.storageKeys.oauthState, state);

  return url.toString();
}

async function persistSession(user: AuthUser, tokens?: {accessToken?: string; refreshToken?: string}) {
  await AsyncStorage.multiSet([
    [AUTH.storageKeys.user, JSON.stringify(user)],
    [AUTH.storageKeys.loggedIn, 'true'],
  ]);

  if (tokens?.accessToken) {
    await AsyncStorage.setItem(AUTH.storageKeys.accessToken, tokens.accessToken);
  }

  if (tokens?.refreshToken) {
    await AsyncStorage.setItem(AUTH.storageKeys.refreshToken, tokens.refreshToken);
  }
}

async function fetchCurrentUser(accessToken: string): Promise<AuthUser> {
  const response = await fetchWithApiDelay(`https://${AUTH.domain}${AUTH.endpoints.userInfo}`, {
    headers: {Authorization: `Bearer ${accessToken}`},
  });

  if (!response.ok) {
    throw new Error('Unable to fetch user profile');
  }

  return response.json();
}

async function exchangeCodeForToken(code: string): Promise<TokenResponse> {
  const response = await fetchWithApiDelay(`${AUTH.issuer}${AUTH.endpoints.token}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: getRedirectUrl(),
      client_id: AUTH.clientId,
      client_secret: AUTH.clientSecret,
    }).toString(),
  });

  if (!response.ok) {
    throw new Error('Unable to exchange authorization code');
  }

  return response.json();
}

async function exchangeRefreshToken(refreshToken: string): Promise<TokenResponse> {
  const response = await fetchWithApiDelay(`${AUTH.issuer}${AUTH.endpoints.token}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: AUTH.clientId,
      client_secret: AUTH.clientSecret,
    }).toString(),
  });

  if (!response.ok) {
    throw new Error('Unable to refresh access token');
  }

  return response.json();
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const stored = await AsyncStorage.getItem(AUTH.storageKeys.user);

  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as AuthUser;
  } catch {
    await AsyncStorage.multiRemove([AUTH.storageKeys.user, AUTH.storageKeys.loggedIn]);
    return null;
  }
}

export async function isLoggedIn() {
  return (await AsyncStorage.getItem(AUTH.storageKeys.loggedIn)) === 'true';
}

export async function login(): Promise<AuthUser> {
  const authUrl = await createAuthorizeUrl();

  if (Platform.OS === 'web') {
    window.location.assign(authUrl);
    return new Promise<AuthUser>(() => {});
  }

  const result = await WebBrowser.openAuthSessionAsync(authUrl, getRedirectUrl());

  if (result.type !== 'success') {
    throw new Error('Login was cancelled');
  }

  const callbackUrl = new URL(result.url);
  const user = await completeWebLogin({
    code: callbackUrl.searchParams.get('code'),
    error: callbackUrl.searchParams.get('error'),
    errorDescription: callbackUrl.searchParams.get('error_description'),
    state: callbackUrl.searchParams.get('state'),
  });

  return user;
}

async function persistTokenUser(token: TokenResponse): Promise<AuthUser> {
  const accessToken = token.access_token ?? token.accessToken;

  if (!accessToken) {
    throw new Error('Access token is missing');
  }

  const user = await fetchCurrentUser(accessToken);
  await persistSession(user, {
    accessToken,
    refreshToken: token.refresh_token ?? token.refreshToken,
  });

  return user;
}

export async function completeWebLogin(params: {
  code?: string | null;
  error?: string | null;
  errorDescription?: string | null;
  state?: string | null;
}): Promise<AuthUser> {
  if (params.error) {
    throw new Error(params.errorDescription || params.error);
  }

  if (!params.code) {
    throw new Error('Authorization code is missing');
  }

  const expectedState = await AsyncStorage.getItem(AUTH.storageKeys.oauthState);

  if (!params.state || !expectedState || params.state !== expectedState) {
    throw new Error('Invalid authorization state');
  }

  const user = await persistTokenUser(await exchangeCodeForToken(params.code));
  await AsyncStorage.removeItem(AUTH.storageKeys.oauthState);

  return user;
}

export async function restoreSession(): Promise<AuthUser | null> {
  const refreshToken = await AsyncStorage.getItem(AUTH.storageKeys.refreshToken);
  if (!refreshToken) {
    return getCurrentUser();
  }

  try {
    return persistTokenUser(await exchangeRefreshToken(refreshToken));
  } catch {
    return getCurrentUser();
  }
}

export async function getAccessToken() {
  return AsyncStorage.getItem(AUTH.storageKeys.accessToken);
}

export async function logout() {
  await AsyncStorage.multiRemove([
    AUTH.storageKeys.user,
    AUTH.storageKeys.accessToken,
    AUTH.storageKeys.refreshToken,
    AUTH.storageKeys.loggedIn,
    AUTH.storageKeys.oauthState,
  ]);
}

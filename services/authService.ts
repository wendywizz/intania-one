import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import {Platform} from 'react-native';
import {AUTH} from '../constants/auth';
import type {AuthUser} from '../models/types';
import {fetchWithApiDelay} from './api';

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  accessToken?: string;
  refreshToken?: string;
};

WebBrowser.maybeCompleteAuthSession();

type OpenIdDiscovery = {
  authorization_endpoint?: string;
  token_endpoint?: string;
  userinfo_endpoint?: string;
  issuer?: string;
};

let discoveryPromise: Promise<OpenIdDiscovery> | null = null;

function getDiscoveryUrl() {
  return Platform.OS === 'web' ? AUTH.webProxy.discovery : AUTH.discoveryUrl;
}

function getTokenRequestUrl(tokenEndpoint: string) {
  return Platform.OS === 'web' ? AUTH.webProxy.token : tokenEndpoint;
}

function getUserInfoRequestUrl(userInfoEndpoint: string) {
  return Platform.OS === 'web' ? AUTH.webProxy.userInfo : userInfoEndpoint;
}

function textClaim(claims: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = claims[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof value === 'number') {
      return String(value);
    }
  }

  return '';
}

function decodeJwtPayload(token?: string) {
  if (!token || typeof atob === 'undefined') {
    return {};
  }

  try {
    const payload = token.split('.')[1];
    if (!payload) {
      return {};
    }

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function logAuthClaims(source: string, claims: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  const keys = Object.keys(claims).sort();
  const staffCandidates = [
    'psu_id',
    'staffId',
    'staff_id',
    'STAFF_ID',
    'employee_id',
    'employeeId',
    'preferred_username',
    'username',
    'sub',
  ].reduce<Record<string, unknown>>((result, key) => {
    if (claims[key] !== undefined) {
      result[key] = claims[key];
    }

    return result;
  }, {});

  console.info(`[auth] ${source} claim keys`, keys);
  console.info(`[auth] ${source} staff id candidates`, staffCandidates);
}

function normalizeUser(claims: Record<string, unknown>): AuthUser {
  const firstName = textClaim(claims, ['given_name', 'firstName', 'first_name', 'staffFirstName', 'staff_first_name']);
  const lastName = textClaim(claims, ['family_name', 'lastName', 'last_name', 'staffLastName', 'staff_last_name']);
  const fullName = textClaim(claims, [
    'name',
    'displayName',
    'display_name',
    'fullName',
    'full_name',
    'staffName',
    'staff_name',
    'staffFullName',
    'staff_full_name',
    'staffFullname',
    'staff_fullname',
  ]);
  const staffId = textClaim(claims, [
    'psu_id',
    'staffId',
    'staff_id',
    'STAFF_ID',
    'employee_id',
    'employeeId',
    'preferred_username',
    'username',
    'sub',
  ]);

  return {
    ...claims,
    staffId,
    name: fullName || [firstName, lastName].filter(Boolean).join(' ') || staffId,
    email: textClaim(claims, ['email', 'mail', 'staffEmail', 'staff_email']),
    displayName: fullName || [firstName, lastName].filter(Boolean).join(' ') || staffId,
    fullName: fullName || [firstName, lastName].filter(Boolean).join(' '),
  };
}

async function getOAuthErrorMessage(response: Response, fallback: string) {
  try {
    const json = (await response.json()) as Record<string, unknown>;
    const errorDescription = textClaim(json, ['error_description', 'errorDescription', 'message']);
    const error = textClaim(json, ['error']);
    return [fallback, errorDescription || error].filter(Boolean).join(': ');
  } catch {
    return fallback;
  }
}

async function getDiscovery() {
  if (!discoveryPromise) {
    discoveryPromise = fetchWithApiDelay(getDiscoveryUrl())
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Unable to load OpenID configuration');
        }

        return response.json() as Promise<OpenIdDiscovery>;
      })
      .catch(() => ({}));
  }

  return discoveryPromise;
}

async function getAuthorizeEndpoint() {
  const discovery = await getDiscovery();
  return discovery.authorization_endpoint ?? AUTH.endpoints.authorize;
}

async function getTokenEndpoint() {
  const discovery = await getDiscovery();
  return discovery.token_endpoint ?? AUTH.endpoints.token;
}

async function getUserInfoEndpoint() {
  const discovery = await getDiscovery();
  return discovery.userinfo_endpoint ?? AUTH.endpoints.userInfo;
}

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

  return AUTH.nativeRedirectUrl;
}

async function createAuthorizeUrl() {
  const state = createRandomState();
  const url = new URL(await getAuthorizeEndpoint());

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

async function fetchCurrentUser(accessToken: string, idToken?: string): Promise<AuthUser> {
  const response = await fetchWithApiDelay(getUserInfoRequestUrl(await getUserInfoEndpoint()), {
    headers: {Authorization: `Bearer ${accessToken}`},
  });

  if (!response.ok) {
    throw new Error('Unable to fetch user profile');
  }

  const userInfoClaims = (await response.json()) as Record<string, unknown>;
  const idTokenClaims = decodeJwtPayload(idToken);
  const claims = {
    ...idTokenClaims,
    ...userInfoClaims,
  };

  logAuthClaims('userinfo', userInfoClaims);
  logAuthClaims('id_token', idTokenClaims);
  logAuthClaims('normalized', claims);

  return normalizeUser(claims);
}

async function exchangeCodeForToken(code: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: getRedirectUrl(),
    client_id: AUTH.clientId,
  });

  if (AUTH.clientSecret) {
    body.set('client_secret', AUTH.clientSecret);
  }

  const response = await fetchWithApiDelay(getTokenRequestUrl(await getTokenEndpoint()), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(await getOAuthErrorMessage(response, 'Unable to exchange authorization code'));
  }

  return response.json();
}

async function exchangeRefreshToken(refreshToken: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: AUTH.clientId,
  });

  if (AUTH.clientSecret) {
    body.set('client_secret', AUTH.clientSecret);
  }

  const response = await fetchWithApiDelay(getTokenRequestUrl(await getTokenEndpoint()), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(await getOAuthErrorMessage(response, 'Unable to refresh access token'));
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

  const user = await fetchCurrentUser(accessToken, token.id_token);
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

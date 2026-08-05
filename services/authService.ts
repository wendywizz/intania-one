import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import {router} from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {Platform} from 'react-native';
import {AUTH} from '../constants/auth';
import {METRO_PROXY_ENDPOINTS} from '../constants/endpoints';
import type {AuthUser} from '../models/types';
import {fetchApi} from './api';

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

const CHROME_ANDROID_PACKAGE = 'com.android.chrome';
const ANDROID_OPENID_BROWSER_MESSAGE = [
  'OpenID login needs a modern Android browser on this emulator.',
  'Install or update Chrome, or use an Android Studio emulator image with Play Store.',
  'The current emulator WebView can fail inside PSU SSO with window.customElements.getName.',
].join(' ');

let discoveryPromise: Promise<OpenIdDiscovery> | null = null;
let androidWebViewAuthSession:
  | {
      resolve: (user: AuthUser) => void;
      reject: (error: Error) => void;
    }
  | null = null;
let completedAuthCallback:
  | {
      code: string;
      state: string;
      user: AuthUser;
    }
  | null = null;
let pendingAuthStates: string[] = [];

function getOpenIdCorsMessage(action: string) {
  return [
    `Unable to ${action}`,
    `OpenID server must allow CORS for ${AUTH.webRedirectUrl} when running on web`,
  ].join('. ');
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
  const statusText = response.status ? `HTTP ${response.status}` : '';

  try {
    const json = (await response.clone().json()) as Record<string, unknown>;
    const errorDescription = textClaim(json, ['error_description', 'errorDescription', 'message']);
    const error = textClaim(json, ['error']);
    return [fallback, errorDescription || error || statusText].filter(Boolean).join(': ');
  } catch {
    try {
      const text = (await response.text()).trim();
      const shortText = text.replace(/\s+/g, ' ').slice(0, 240);
      return [fallback, shortText || statusText].filter(Boolean).join(': ');
    } catch {
      return [fallback, statusText].filter(Boolean).join(': ');
    }
  }
}

async function getDiscovery() {
  if (Platform.OS === 'web') {
    return {};
  }

  if (!discoveryPromise) {
    discoveryPromise = fetchApi(AUTH.discoveryUrl)
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

async function fetchOpenId(input: RequestInfo | URL, init?: RequestInit, action = 'connect to OpenID') {
  try {
    return await fetchApi(input, init);
  } catch (error) {
    if (Platform.OS === 'web') {
      throw new Error(getOpenIdCorsMessage(action));
    }

    throw error;
  }
}

async function getAuthorizeEndpoint() {
  const discovery = await getDiscovery();
  return discovery.authorization_endpoint ?? AUTH.endpoints.authorize;
}

async function getTokenEndpoint() {
  if (Platform.OS === 'web') {
    return METRO_PROXY_ENDPOINTS.routes.openIdToken;
  }

  const discovery = await getDiscovery();
  return discovery.token_endpoint ?? AUTH.endpoints.token;
}

async function getUserInfoEndpoint() {
  if (Platform.OS === 'web') {
    return METRO_PROXY_ENDPOINTS.routes.openIdUserInfo;
  }

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

async function getPendingAuthStates() {
  const storedState = await AsyncStorage.getItem(AUTH.storageKeys.oauthState);
  const storedStates =
    storedState
      ? (() => {
          try {
            const parsed = JSON.parse(storedState) as unknown;
            if (Array.isArray(parsed)) {
              return parsed.filter((state): state is string => typeof state === 'string' && Boolean(state));
            }
          } catch {
            return [storedState];
          }

          return [];
        })()
      : [];

  return Array.from(new Set([...storedStates, ...pendingAuthStates]));
}

async function savePendingAuthState(state: string) {
  const states = [state, ...(await getPendingAuthStates()).filter((pendingState) => pendingState !== state)].slice(0, 5);
  pendingAuthStates = states;
  await AsyncStorage.setItem(AUTH.storageKeys.oauthState, JSON.stringify(states));
}

async function removePendingAuthState(state: string) {
  const states = (await getPendingAuthStates()).filter((pendingState) => pendingState !== state);
  pendingAuthStates = states;

  if (states.length) {
    await AsyncStorage.setItem(AUTH.storageKeys.oauthState, JSON.stringify(states));
    return;
  }

  await AsyncStorage.removeItem(AUTH.storageKeys.oauthState);
}

function getRedirectUrl() {
  if (Platform.OS === 'web') {
    return AUTH.webRedirectUrl;
  }

  return AUTH.nativeRedirectUrl;
}

function readOptionalEnv(name: string) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

async function getAndroidAuthSessionOptions(authUrl: string): Promise<WebBrowser.AuthSessionOpenOptions | null> {
  const options: WebBrowser.AuthSessionOpenOptions = {
    createTask: false,
    enableDefaultShareMenuItem: false,
    showTitle: true,
  };

  if (Platform.OS !== 'android') {
    return options;
  }

  if (Constants.appOwnership === 'expo') {
    if (process.env.NODE_ENV !== 'production') {
      console.info('[auth] Using in-app OpenID WebView for Android Expo Go redirect handling');
    }

    return null;
  }

  const configuredBrowserPackage = readOptionalEnv('EXPO_PUBLIC_OPENID_ANDROID_BROWSER_PACKAGE');

  try {
    const browsers = await WebBrowser.getCustomTabsSupportingBrowsersAsync();
    const hasChrome =
      browsers.browserPackages.includes(CHROME_ANDROID_PACKAGE) ||
      browsers.servicePackages.includes(CHROME_ANDROID_PACKAGE);
    const browserPackage = configuredBrowserPackage || (hasChrome ? CHROME_ANDROID_PACKAGE : '');

    if (!browserPackage) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[auth] Falling back to in-app OpenID WebView', ANDROID_OPENID_BROWSER_MESSAGE);
      }

      return null;
    }

    if (browserPackage) {
      options.browserPackage = browserPackage;
      await WebBrowser.coolDownAsync(browserPackage).catch(() => undefined);
      await WebBrowser.warmUpAsync(browserPackage).catch(() => undefined);
      await WebBrowser.mayInitWithUrlAsync(authUrl, browserPackage).catch(() => undefined);
    }

    if (process.env.NODE_ENV !== 'production') {
      console.info('[auth] Android OpenID browser package', browserPackage || 'default');
      console.info('[auth] Android Custom Tabs browsers', browsers.browserPackages);
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[auth] Unable to inspect Android Custom Tabs browsers', error);
    }

    if (Platform.OS === 'android') {
      return null;
    }
  }

  return options;
}

function loginWithAndroidWebView(authUrl: string) {
  if (androidWebViewAuthSession) {
    androidWebViewAuthSession.reject(new Error('Login was cancelled'));
    androidWebViewAuthSession = null;
  }

  return new Promise<AuthUser>((resolve, reject) => {
    androidWebViewAuthSession = {resolve, reject};
    router.push({
      pathname: '/openid-webview',
      params: {authUrl},
    });
  });
}

export async function completeAndroidWebViewLogin(callbackUrl: string) {
  const session = androidWebViewAuthSession;
  if (!session) {
    return;
  }

  androidWebViewAuthSession = null;

  try {
    const url = new URL(callbackUrl);
    const user = await completeWebLogin({
      code: url.searchParams.get('code'),
      error: url.searchParams.get('error'),
      errorDescription: url.searchParams.get('error_description'),
      state: url.searchParams.get('state'),
    });

    session.resolve(user);
    await Promise.resolve();
    router.replace('/');
  } catch (error) {
    session.reject(error instanceof Error ? error : new Error(String(error)));
  }
}

export function cancelAndroidWebViewLogin() {
  if (!androidWebViewAuthSession) {
    return;
  }

  androidWebViewAuthSession.reject(new Error('Login was cancelled'));
  androidWebViewAuthSession = null;
}

export async function createAuthorizeUrl() {
  const state = createRandomState();
  const url = new URL(await getAuthorizeEndpoint());

  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', AUTH.clientId);
  url.searchParams.set('redirect_uri', getRedirectUrl());
  url.searchParams.set('scope', AUTH.scopes.join(' '));
  url.searchParams.set('state', state);

  await savePendingAuthState(state);

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
  const response = await fetchOpenId(await getUserInfoEndpoint(), {
    headers: {Authorization: `Bearer ${accessToken}`},
  }, 'fetch user profile');

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

  const response = await fetchOpenId(await getTokenEndpoint(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  }, 'exchange authorization code');

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

  const response = await fetchOpenId(await getTokenEndpoint(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  }, 'refresh access token');

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
    if (typeof window === 'undefined') {
      throw new Error('Browser login is not available');
    }

    window.location.assign(authUrl);
    return new Promise<AuthUser>(() => {});
  }

  if (Platform.OS === 'android') {
    return loginWithAndroidWebView(authUrl);
  }

  const authSessionOptions = await getAndroidAuthSessionOptions(authUrl);

  const result = await WebBrowser.openAuthSessionAsync(authUrl, getRedirectUrl(), authSessionOptions ?? undefined);

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

  const expectedStates = await getPendingAuthStates();
  const callbackState = params.state ?? '';

  if (
    completedAuthCallback &&
    completedAuthCallback.code === params.code &&
    completedAuthCallback.state === callbackState
  ) {
    return completedAuthCallback.user;
  }

  if (!callbackState || !expectedStates.includes(callbackState)) {
    const currentUser = await getCurrentUser();

    if (currentUser && expectedStates.length === 0) {
      return currentUser;
    }

    throw new Error('Invalid authorization state');
  }

  const user = await persistTokenUser(await exchangeCodeForToken(params.code));
  completedAuthCallback = {
    code: params.code,
    state: callbackState,
    user,
  };
  await removePendingAuthState(callbackState);

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
  completedAuthCallback = null;
  pendingAuthStates = [];
  await AsyncStorage.multiRemove([
    AUTH.storageKeys.user,
    AUTH.storageKeys.accessToken,
    AUTH.storageKeys.refreshToken,
    AUTH.storageKeys.loggedIn,
    AUTH.storageKeys.oauthState,
  ]);
}

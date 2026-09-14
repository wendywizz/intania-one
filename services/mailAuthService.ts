import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { MAIL_AUTH } from '@/constants/mailAuth';
import { TEXT } from '@/constants/text';
import { fetchApi } from '@/services/api';

/**
 * OAuth (PKCE, public client) against Microsoft Entra ID for the mail
 * module, and the token store behind it.
 *
 * Deliberately independent of `services/authService.ts` — PSU SSO and PSU's
 * Microsoft 365 tenant are separate identity providers, so this file shares
 * no state, no storage keys, and no imports with it. See
 * `constants/mailAuth.ts` for why.
 */

WebBrowser.maybeCompleteAuthSession();

export type MailAccount = {
  displayName: string;
  mail: string;
};

type EntraTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
};

// SecureStore has no web implementation, and the intania-one-mail app
// registration has no Web redirect URI registered in Entra either — web is
// unsupported for this module in v1 on both counts.
const isSupported = Platform.OS !== 'web';
export const MAIL_SUPPORTED_ON_PLATFORM = isSupported;

/** Marker the caller matches on to redirect to /mail/connect instead of ErrorState. */
export const MAIL_REAUTH_REQUIRED = 'MAIL_REAUTH_REQUIRED';
export function isMailReauthRequiredText(text?: string | null) {
  return typeof text === 'string' && text.startsWith(MAIL_REAUTH_REQUIRED);
}

const REFRESH_MARGIN_MS = 5 * 60 * 1000;

let androidWebViewSession:
  | { resolve: () => void; reject: (error: Error) => void }
  | null = null;

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function createState() {
  return toHex(Crypto.getRandomBytes(16));
}

/** 64 hex chars — within RFC 7636's 43-128 length, all unreserved characters. */
function createCodeVerifier() {
  return toHex(Crypto.getRandomBytes(32));
}

async function createCodeChallenge(verifier: string) {
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, {
    encoding: Crypto.CryptoEncoding.BASE64,
  });
  // base64 -> base64url, no padding.
  return digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getOAuthErrorMessage(response: Response, fallback: string) {
  try {
    const json = (await response.clone().json()) as Record<string, unknown>;
    const description = typeof json.error_description === 'string' ? json.error_description : '';
    const error = typeof json.error === 'string' ? json.error : '';
    return [fallback, description || error].filter(Boolean).join(': ');
  } catch {
    return fallback;
  }
}

// ─── Pending PKCE flow (one at a time — connect() only ever starts from the
// one explicit /mail/connect screen, unlike psusso which can be triggered
// from several places) ──────────────────────────────────────────────────────

type PendingFlow = { state: string; codeVerifier: string };

async function savePendingFlow(flow: PendingFlow) {
  if (!isSupported) return;
  await SecureStore.setItemAsync(MAIL_AUTH.storageKeys.pkcePending, JSON.stringify(flow));
}

async function readPendingFlow(): Promise<PendingFlow | null> {
  if (!isSupported) return null;
  try {
    const raw = await SecureStore.getItemAsync(MAIL_AUTH.storageKeys.pkcePending);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingFlow>;
    return parsed.state && parsed.codeVerifier ? (parsed as PendingFlow) : null;
  } catch {
    return null;
  }
}

async function clearPendingFlow() {
  if (!isSupported) return;
  try {
    await SecureStore.deleteItemAsync(MAIL_AUTH.storageKeys.pkcePending);
  } catch {
    // A failed delete only leaves a pending flow nothing reads once it's spent.
  }
}

// ─── Token persistence ──────────────────────────────────────────────────────

async function persistTokens(tokens: EntraTokenResponse) {
  if (!isSupported) return;
  const expiresAt = Date.now() + Number(tokens.expires_in ?? 0) * 1000;
  await SecureStore.setItemAsync(MAIL_AUTH.storageKeys.accessToken, tokens.access_token);
  await SecureStore.setItemAsync(MAIL_AUTH.storageKeys.expiresAt, String(expiresAt));
  if (tokens.refresh_token) {
    await SecureStore.setItemAsync(MAIL_AUTH.storageKeys.refreshToken, tokens.refresh_token);
  }
}

async function readTokens() {
  if (!isSupported) {
    return { accessToken: null, refreshToken: null, expiresAt: null } as const;
  }

  const [accessToken, refreshToken, expiresAt] = await Promise.all([
    SecureStore.getItemAsync(MAIL_AUTH.storageKeys.accessToken),
    SecureStore.getItemAsync(MAIL_AUTH.storageKeys.refreshToken),
    SecureStore.getItemAsync(MAIL_AUTH.storageKeys.expiresAt),
  ]);

  return { accessToken, refreshToken, expiresAt };
}

async function clearTokens() {
  if (!isSupported) return;
  try {
    await SecureStore.deleteItemAsync(MAIL_AUTH.storageKeys.accessToken);
    await SecureStore.deleteItemAsync(MAIL_AUTH.storageKeys.refreshToken);
    await SecureStore.deleteItemAsync(MAIL_AUTH.storageKeys.expiresAt);
  } catch {
    // A failed delete only leaves tokens nothing else will read as "connected".
  }
  await AsyncStorage.removeItem(MAIL_AUTH.storageKeys.account).catch(() => undefined);
}

/** Best-effort — a missing display name never blocks the connection itself. */
async function fetchAndCacheAccount(accessToken: string) {
  try {
    const response = await fetchApi(
      `${MAIL_AUTH.endpoints.graphBase}/me?$select=displayName,mail,userPrincipalName`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!response.ok) return;
    const json = (await response.json()) as Record<string, unknown>;
    const account: MailAccount = {
      displayName: String(json.displayName ?? ''),
      mail: String(json.mail ?? json.userPrincipalName ?? ''),
    };
    await AsyncStorage.setItem(MAIL_AUTH.storageKeys.account, JSON.stringify(account));
  } catch {
    // See above — not fatal.
  }
}

export async function getAccount(): Promise<MailAccount | null> {
  try {
    const raw = await AsyncStorage.getItem(MAIL_AUTH.storageKeys.account);
    return raw ? (JSON.parse(raw) as MailAccount) : null;
  } catch {
    return null;
  }
}

// ─── Token exchange ─────────────────────────────────────────────────────────

async function exchangeCodeForToken(code: string, codeVerifier: string): Promise<EntraTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: MAIL_AUTH.clientId,
    code,
    redirect_uri: MAIL_AUTH.redirectUrl,
    code_verifier: codeVerifier,
    scope: MAIL_AUTH.scopes.join(' '),
  });

  const response = await fetchApi(MAIL_AUTH.endpoints.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(await getOAuthErrorMessage(response, TEXT.MAIL_CONNECT_FAILED));
  }

  return response.json();
}

async function exchangeRefreshToken(refreshToken: string): Promise<EntraTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: MAIL_AUTH.clientId,
    refresh_token: refreshToken,
    scope: MAIL_AUTH.scopes.join(' '),
  });

  const response = await fetchApi(MAIL_AUTH.endpoints.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(await getOAuthErrorMessage(response, 'ไม่สามารถต่ออายุการเชื่อมต่ออีเมลได้'));
  }

  return response.json();
}

async function createAuthorizeUrl() {
  const state = createState();
  const codeVerifier = createCodeVerifier();
  const codeChallenge = await createCodeChallenge(codeVerifier);

  const url = new URL(MAIL_AUTH.endpoints.authorize);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', MAIL_AUTH.clientId);
  url.searchParams.set('redirect_uri', MAIL_AUTH.redirectUrl);
  url.searchParams.set('scope', MAIL_AUTH.scopes.join(' '));
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');

  await savePendingFlow({ state, codeVerifier });

  return url.toString();
}

async function completeAuth(params: {
  code?: string | null;
  error?: string | null;
  errorDescription?: string | null;
  state?: string | null;
}) {
  if (params.error) {
    throw new Error(params.errorDescription || params.error);
  }

  if (!params.code) {
    throw new Error('Authorization code is missing');
  }

  const pending = await readPendingFlow();
  if (!pending || !params.state || pending.state !== params.state) {
    throw new Error('Invalid authorization state');
  }

  await clearPendingFlow();
  const tokens = await exchangeCodeForToken(params.code, pending.codeVerifier);
  await persistTokens(tokens);
  await fetchAndCacheAccount(tokens.access_token);
}

// ─── Native WebView redirect (Android — mirrors authService.ts's own Android
// behavior, which sends all Android traffic through the in-app WebView) ────

function loginWithAndroidWebView(authUrl: string) {
  if (androidWebViewSession) {
    androidWebViewSession.reject(new Error(TEXT.MAIL_CONNECT_CANCELLED_MESSAGE));
    androidWebViewSession = null;
  }

  return new Promise<void>((resolve, reject) => {
    androidWebViewSession = { resolve, reject };
    router.push({ pathname: '/mail/webview', params: { authUrl } });
  });
}

export async function completeAndroidWebViewLogin(callbackUrl: string) {
  const session = androidWebViewSession;
  if (!session) return;

  androidWebViewSession = null;

  try {
    const url = new URL(callbackUrl);
    await completeAuth({
      code: url.searchParams.get('code'),
      error: url.searchParams.get('error'),
      errorDescription: url.searchParams.get('error_description'),
      state: url.searchParams.get('state'),
    });

    session.resolve();
    await Promise.resolve();
    router.replace('/mail');
  } catch (error) {
    session.reject(error instanceof Error ? error : new Error(String(error)));
  }
}

export function cancelAndroidWebViewLogin() {
  if (!androidWebViewSession) return;
  androidWebViewSession.reject(new Error('Connection was cancelled'));
  androidWebViewSession = null;
}

// ─── Public surface ─────────────────────────────────────────────────────────

export async function isConnected() {
  if (!isSupported) return false;
  const { refreshToken } = await readTokens();
  return Boolean(refreshToken);
}

export async function connect(): Promise<void> {
  if (!isSupported) {
    throw new Error(TEXT.MAIL_CONNECT_WEB_UNSUPPORTED);
  }

  const authUrl = await createAuthorizeUrl();

  if (Platform.OS === 'android') {
    await loginWithAndroidWebView(authUrl);
    return;
  }

  const result = await WebBrowser.openAuthSessionAsync(authUrl, MAIL_AUTH.redirectUrl);

  if (result.type !== 'success') {
    await clearPendingFlow();
    throw new Error(TEXT.MAIL_CONNECT_CANCELLED_MESSAGE);
  }

  const callbackUrl = new URL(result.url);
  await completeAuth({
    code: callbackUrl.searchParams.get('code'),
    error: callbackUrl.searchParams.get('error'),
    errorDescription: callbackUrl.searchParams.get('error_description'),
    state: callbackUrl.searchParams.get('state'),
  });
}

export async function disconnect() {
  await clearPendingFlow();
  await clearTokens();
}

/**
 * Returns an access token guaranteed to be valid for at least
 * `REFRESH_MARGIN_MS`, refreshing proactively via the stored refresh token
 * when needed. Throws `MAIL_REAUTH_REQUIRED` when there is nothing to refresh
 * from — callers redirect to /mail/connect on that, rather than showing a
 * generic ErrorState.
 */
export async function getValidAccessToken(): Promise<string> {
  if (!isSupported) {
    throw new Error(MAIL_REAUTH_REQUIRED);
  }

  const { accessToken, refreshToken, expiresAt } = await readTokens();
  if (!accessToken || !refreshToken) {
    throw new Error(MAIL_REAUTH_REQUIRED);
  }

  if (Date.now() < Number(expiresAt ?? 0) - REFRESH_MARGIN_MS) {
    return accessToken;
  }

  try {
    const refreshed = await exchangeRefreshToken(refreshToken);
    await persistTokens(refreshed);
    return refreshed.access_token;
  } catch {
    // Refresh token revoked/expired — nothing left to try silently, force a
    // clean reconnect rather than looping on the same failure.
    await disconnect();
    throw new Error(MAIL_REAUTH_REQUIRED);
  }
}

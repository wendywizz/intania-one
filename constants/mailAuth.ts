import { Platform } from 'react-native';

import { ENV } from './config';
import { AUTH_REDIRECT_DOMAINS, ENTRA_AUTHORIZE_URL, ENTRA_TOKEN_URL, GRAPH_API_BASE_URL } from './endpoints';

/**
 * Config for the mail module's own OAuth flow against Microsoft Entra ID.
 *
 * Deliberately independent of `constants/auth.ts`'s `AUTH` — PSU SSO
 * (psusso.psu.ac.th, Authentik) and PSU's Microsoft 365 tenant are two
 * separate identity providers. A token from one cannot authenticate the
 * other, so nothing here is shared with `AUTH` or `AUTH.storageKeys`: this
 * mailbox connection is opt-in, per-account, and independently
 * connect/disconnect-able.
 *
 * Native-only for v1 — the `intania-one-mail` app registration has a single
 * "Mobile and desktop applications" redirect URI and no Web platform entry,
 * so `services/mailAuthService.ts` refuses `connect()` on web rather than
 * attempting a flow that has nowhere to redirect back to.
 */
export const MAIL_REDIRECT_PATH = 'mail/callback';

/**
 * Mock mode: lets the mail screens be built and clicked through in a plain
 * web browser (`expo start --web`) — the one place the real flow can never
 * run, both because SecureStore has no web implementation and because the
 * `intania-one-mail` app registration has no Web redirect URI registered in
 * Entra at all. `services/mailAuthService.ts` and `services/mailService.ts`
 * branch on this to serve `services/mailMockData.ts` instead of Entra/Graph.
 *
 * Gated on BOTH conditions, not just platform, so a *production* web build —
 * should one ever exist — still shows the same "not supported on web" state
 * a real user would see, never a pretend inbox. `ENV.appMode` is the same
 * `EXPO_PUBLIC_MODE`-driven switch every other dev/prod split in this app
 * uses (see constants/endpoints.ts's `API_BASE_URL`).
 */
export const MAIL_MOCK_ENABLED = ENV.appMode !== 'production' && Platform.OS === 'web';

/**
 * What the app asks Microsoft for. Fixed, not env-driven — same as AUTH.scopes
 * in constants/auth.ts — but in two tiers, because which tier is asked for is
 * decided at runtime by the 'scooba-psu-mail-compose' App row (see
 * `mailScopes` below and scooba-service's GET /api/mail/status).
 *
 * The split exists because Microsoft approves a sign-in request as a whole: if
 * PSU IT approves reading mail but not sending it, asking for Mail.Send would
 * block the inbox too. Both tiers must be listed under API permissions on the
 * intania-one-mail app registration for an admin to grant them.
 */
export const MAIL_READ_SCOPES = ['Mail.Read', 'offline_access', 'User.Read'] as const;
// Mail.ReadWrite covers drafts and marking a message read; Mail.Send covers
// sending. Neither implies the other.
export const MAIL_COMPOSE_SCOPES = ['Mail.ReadWrite', 'Mail.Send'] as const;

export function mailScopes(composeEnabled: boolean): string {
  return [...MAIL_READ_SCOPES, ...(composeEnabled ? MAIL_COMPOSE_SCOPES : [])].join(' ');
}

export const MAIL_AUTH = {
  clientId: ENV.graphClientId,
  tenantId: ENV.graphTenantId,
  redirectUrl: `${AUTH_REDIRECT_DOMAINS.native}://${MAIL_REDIRECT_PATH}`,
  endpoints: {
    authorize: ENTRA_AUTHORIZE_URL,
    token: ENTRA_TOKEN_URL,
    graphBase: GRAPH_API_BASE_URL,
  },
  storageKeys: {
    // SecureStore — tokens for a mailbox-read scope are at least as sensitive
    // as anything else in this app, so unlike AUTH.storageKeys (AsyncStorage)
    // these follow the one existing SecureStore precedent, appPasswordService.ts.
    accessToken: 'MAIL_ACCESS_TOKEN',
    refreshToken: 'MAIL_REFRESH_TOKEN',
    expiresAt: 'MAIL_TOKEN_EXPIRES_AT',
    // The scope string the stored access token was issued for. Compared with
    // what the compose switch currently wants, so flipping that switch gets a
    // freshly scoped token on the next call instead of a 403 from Graph.
    tokenScopes: 'MAIL_TOKEN_SCOPES',
    // {state, codeVerifier} for the one in-flight connect attempt. The
    // verifier is what lets whoever holds it redeem an intercepted code, so
    // it belongs in SecureStore, not AsyncStorage.
    pkcePending: 'MAIL_PKCE_PENDING',
    // Non-sensitive display cache (name/email from GET /me) — AsyncStorage is
    // fine here, same as AUTH.storageKeys.user.
    account: 'MAIL_ACCOUNT',
  },
} as const;

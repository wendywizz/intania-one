import { MAIL_AUTH, MAIL_MOCK_ENABLED } from '@/constants/mailAuth';
import { ENDPOINTS } from '@/constants/endpoints';
import { fetchWithTimeout, isModuleDisabled, requestJson } from '@/services/api';
import { getValidAccessToken } from '@/services/mailAuthService';
import { mockGetMessage, mockListInbox, mockSearchInbox } from '@/services/mailMockData';

/**
 * Microsoft Graph calls for the mail module. Plain exported async functions
 * and locally-declared types, same convention as every other service in this
 * app — not added to the shared models/types.ts, which is for scooba's own
 * domain models.
 *
 * v1 is read-only Inbox only: no mark-as-read/send/reply/delete (the granted
 * scopes are Mail.Read/offline_access/User.Read, not Mail.ReadWrite/
 * Mail.Send — a write call would 403 regardless), no folder navigation.
 */

export type MailMessage = {
  id: string;
  subject: string;
  from: { name: string; address: string };
  receivedDateTime: string;
  isRead: boolean;
  bodyPreview: string;
  body?: { contentType: 'html' | 'text'; content: string };
};

type GraphMessage = {
  id: string;
  subject?: string;
  from?: { emailAddress?: { name?: string; address?: string } };
  receivedDateTime?: string;
  isRead?: boolean;
  bodyPreview?: string;
  body?: { contentType?: string; content?: string };
};

type GraphListResponse = { value: GraphMessage[]; '@odata.nextLink'?: string };
type GraphErrorResponse = { error?: { code?: string; message?: string } };

function toMailMessage(message: GraphMessage): MailMessage {
  return {
    id: message.id,
    subject: message.subject ?? '',
    from: {
      name: message.from?.emailAddress?.name ?? '',
      address: message.from?.emailAddress?.address ?? '',
    },
    receivedDateTime: message.receivedDateTime ?? '',
    isRead: message.isRead ?? true,
    bodyPreview: message.bodyPreview ?? '',
    body: message.body
      ? {
          contentType: message.body.contentType === 'text' ? 'text' : 'html',
          content: message.body.content ?? '',
        }
      : undefined,
  };
}

/**
 * The Graph fetch transport. Attaches the mail module's own bearer token
 * explicitly — never via `withApiToken` in services/api.ts, which only ever
 * attaches the scooba API key, and only to scooba's own API_BASE_URL.
 * `getValidAccessToken()` throws MAIL_REAUTH_REQUIRED when there's nothing to
 * refresh from; that propagates as-is so callers can redirect to connect.
 */
async function graphFetch<T>(url: string): Promise<T> {
  const token = await getValidAccessToken();
  const response = await fetchWithTimeout(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const json = (await response.json().catch(() => ({}))) as GraphErrorResponse;
    throw new Error(json.error?.message || 'ไม่สามารถโหลดอีเมลได้');
  }

  return response.json() as Promise<T>;
}

/**
 * Whether the mail module is switched on, via scooba-service's App-row switch
 * ('scooba-psu-mail' — see scooba-service/config/app-registry.js).
 *
 * This is the one mail call that goes to scooba rather than Microsoft: the
 * module's real traffic (OAuth, Graph reads) never touches the gateway, so
 * there is nothing else for that switch to gate. `requestJson` already turns
 * the gateway's 503 ModuleDisabled into a MODULE_DISABLED-marked Error the
 * same way every other module's screens get for free — see
 * constants/module-status.ts — so callers here just need to let it propagate
 * into an `ErrorState`.
 *
 * Resolves silently (does not throw) on anything that isn't the gateway
 * explicitly saying the module is off — a network hiccup here must not block
 * the connect screen or the inbox when the module is in fact on.
 *
 * Skipped entirely in mock mode: the whole point of `MAIL_MOCK_ENABLED` is
 * clicking through the mail screens on web without a running scooba-service,
 * so this must not turn into a network call that just fails differently.
 */
export async function assertMailModuleEnabled(): Promise<void> {
  if (MAIL_MOCK_ENABLED) return;

  try {
    await requestJson(ENDPOINTS.mailStatus);
  } catch (error) {
    if (isModuleDisabled(error)) {
      throw error;
    }
    // Gateway unreachable, timed out, etc. — not our call to make here.
  }
}

const LIST_SELECT = 'id,subject,from,receivedDateTime,isRead,bodyPreview';
const DETAIL_SELECT = `${LIST_SELECT},body`;

export async function listInboxMessages({
  top = 25,
  nextLink,
}: { top?: number; nextLink?: string } = {}): Promise<{ messages: MailMessage[]; nextLink?: string }> {
  if (MAIL_MOCK_ENABLED) {
    // `nextLink` is an opaque string everywhere else (Graph's own
    // `@odata.nextLink`); in mock mode it is just a stringified offset into
    // the fixture array, encoded/decoded only here.
    const cursor = nextLink ? Number(nextLink) : 0;
    const result = await mockListInbox({ top, cursor });
    return {
      messages: result.messages,
      nextLink: result.nextCursor != null ? String(result.nextCursor) : undefined,
    };
  }

  const url =
    nextLink ??
    `${MAIL_AUTH.endpoints.graphBase}/me/mailFolders/inbox/messages` +
      `?$top=${top}&$orderby=receivedDateTime desc&$select=${LIST_SELECT}`;

  const json = await graphFetch<GraphListResponse>(url);
  return {
    messages: (json.value ?? []).map(toMailMessage),
    nextLink: json['@odata.nextLink'],
  };
}

/**
 * Full-text search across the Inbox — subject, sender and body — via Graph's
 * own `$search`, not a client-side filter of whatever page happens to be
 * loaded. That matters here specifically: `listInboxMessages` only ever holds
 * the pages paged in so far, so filtering it in JS would silently miss every
 * older message the person hasn't scrolled to yet.
 *
 * Deliberately no `nextLink` — Graph returns `$search` hits ranked by
 * relevance, not `$orderby`'d (the two cannot be combined on this resource),
 * and the top 25 already answers "did I find it", the only question a search
 * box is for here. Same reasoning `person-search.tsx`'s `getPersonnelSuggestions`
 * hard-caps at `PAGE_SIZE` rather than paging.
 */
export async function searchInboxMessages(
  query: string,
  { top = 25 }: { top?: number } = {},
): Promise<{ messages: MailMessage[] }> {
  if (MAIL_MOCK_ENABLED) {
    const result = await mockSearchInbox(query);
    return { messages: result.messages.slice(0, top) };
  }

  // A bare `"` would break out of the quoted $search term below — Graph's own
  // OData query, not HTML, so this is quote-stripping, not escaping.
  const safeQuery = query.replace(/"/g, '').trim();
  if (!safeQuery) return { messages: [] };

  const url =
    `${MAIL_AUTH.endpoints.graphBase}/me/mailFolders/inbox/messages` +
    `?$search=${encodeURIComponent(`"${safeQuery}"`)}&$top=${top}&$select=${LIST_SELECT}`;

  const json = await graphFetch<GraphListResponse>(url);
  return { messages: (json.value ?? []).map(toMailMessage) };
}

export async function getMessage(id: string): Promise<MailMessage> {
  if (MAIL_MOCK_ENABLED) return mockGetMessage(id);

  const url = `${MAIL_AUTH.endpoints.graphBase}/me/messages/${encodeURIComponent(id)}?$select=${DETAIL_SELECT}`;
  const json = await graphFetch<GraphMessage>(url);
  return toMailMessage(json);
}

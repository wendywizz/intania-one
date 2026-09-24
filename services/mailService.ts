import { ENDPOINTS } from '@/constants/endpoints';
import { MAIL_AUTH, MAIL_MOCK_ENABLED } from '@/constants/mailAuth';
import type { MailFolderKey, MailReadFilter } from '@/constants/mailFolders';
import type { Person } from '@/models/types';
import { fetchWithTimeout, isModuleDisabled, requestJson } from '@/services/api';
import {
  getValidAccessToken,
  isMailComposeEnabled,
  setMailComposeEnabled,
} from '@/services/mailAuthService';
import {
  mockDeleteDraft,
  mockGetMessage,
  mockInboxUnreadCount,
  mockListMessages,
  mockMarkRead,
  mockSaveDraft,
  mockSearchMessages,
  mockSend,
  mockSuggestRecipients,
} from '@/services/mailMockData';
import { getPersonnelSuggestions } from '@/services/personService';

/**
 * Microsoft Graph calls for the mail module. Plain exported async functions
 * and locally-declared types, same convention as every other service in this
 * app — not added to the shared models/types.ts, which is for scooba's own
 * domain models.
 *
 * Reading needs Mail.Read. Everything that writes — sending, drafts, marking
 * read — needs Mail.ReadWrite / Mail.Send, which the app only asks Microsoft
 * for while the 'scooba-psu-mail-compose' switch is on (see
 * constants/mailAuth.ts). Screens check `isMailComposeEnabled()` before
 * offering any of it; these functions do not re-check, a call made without
 * the scope just comes back 403 from Graph.
 *
 * Every function short-circuits to services/mailMockData.ts under
 * `MAIL_MOCK_ENABLED` (development + web only), before any network call.
 */

export type MailRecipient = { name: string; address: string };

export type MailMessage = {
  id: string;
  subject: string;
  from: MailRecipient;
  toRecipients: MailRecipient[];
  ccRecipients: MailRecipient[];
  receivedDateTime: string;
  isRead: boolean;
  isDraft: boolean;
  bodyPreview: string;
  body?: { contentType: 'html' | 'text'; content: string };
};

export type MailStatus = { compose: boolean };

export type ComposeMode = 'new' | 'reply' | 'replyAll' | 'forward' | 'draft';

export type ComposePayload = {
  mode: ComposeMode;
  /** The message being replied to or forwarded. */
  sourceId?: string;
  /** The draft being edited, once there is one. */
  draftId?: string;
  to: MailRecipient[];
  cc: MailRecipient[];
  subject: string;
  /** Plain text. For reply/forward this is only what the person typed — Graph
   * appends the quoted original itself. */
  body: string;
  /** Leave the stored body as it is. Set when an HTML draft was opened but its
   * text never touched: the composer only edits plain text, and writing that
   * back would flatten formatting nobody asked to change. */
  keepBody?: boolean;
};

type GraphRecipient = { emailAddress?: { name?: string; address?: string } };

type GraphMessage = {
  id: string;
  subject?: string;
  from?: GraphRecipient;
  toRecipients?: GraphRecipient[];
  ccRecipients?: GraphRecipient[];
  receivedDateTime?: string;
  isRead?: boolean;
  isDraft?: boolean;
  bodyPreview?: string;
  body?: { contentType?: string; content?: string };
};

type GraphListResponse = { value: GraphMessage[]; '@odata.nextLink'?: string };
type GraphErrorResponse = { error?: { code?: string; message?: string } };

function toRecipient(recipient?: GraphRecipient): MailRecipient {
  return {
    name: recipient?.emailAddress?.name ?? '',
    address: recipient?.emailAddress?.address ?? '',
  };
}

function toMailMessage(message: GraphMessage): MailMessage {
  return {
    id: message.id,
    subject: message.subject ?? '',
    from: toRecipient(message.from),
    toRecipients: (message.toRecipients ?? []).map(toRecipient),
    ccRecipients: (message.ccRecipients ?? []).map(toRecipient),
    receivedDateTime: message.receivedDateTime ?? '',
    isRead: message.isRead ?? true,
    isDraft: message.isDraft ?? false,
    bodyPreview: message.bodyPreview ?? '',
    body: message.body
      ? {
          contentType: message.body.contentType === 'text' ? 'text' : 'html',
          content: message.body.content ?? '',
        }
      : undefined,
  };
}

function toGraphRecipients(list: MailRecipient[]) {
  return list.map((recipient) => ({
    emailAddress: { address: recipient.address, name: recipient.name || recipient.address },
  }));
}

/**
 * The Graph fetch transport. Attaches the mail module's own bearer token
 * explicitly — never via `withApiToken` in services/api.ts, which only ever
 * attaches the scooba API key, and only to scooba's own API_BASE_URL.
 * `getValidAccessToken()` throws MAIL_REAUTH_REQUIRED when there's nothing to
 * refresh from; that propagates as-is so callers can redirect to connect.
 *
 * Writes answer 202 (send) or 204 (delete) with no body, so an empty body is
 * `undefined` rather than a JSON parse error.
 */
async function graphFetch<T>(url: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = await getValidAccessToken();
  const hasBody = init.body !== undefined;
  const response = await fetchWithTimeout(url, {
    method: init.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    },
    body: hasBody ? JSON.stringify(init.body) : undefined,
  });

  if (!response.ok) {
    const json = (await response.json().catch(() => ({}))) as GraphErrorResponse;
    throw new Error(json.error?.message || 'ไม่สามารถโหลดอีเมลได้');
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

const GRAPH = MAIL_AUTH.endpoints.graphBase;
const LIST_SELECT = 'id,subject,from,toRecipients,receivedDateTime,isRead,isDraft,bodyPreview';
const DETAIL_SELECT = `${LIST_SELECT},ccRecipients,body`;

function folderMessagesUrl(folder: MailFolderKey) {
  return `${GRAPH}/me/mailFolders/${folder}/messages`;
}

// ─── Module switch ──────────────────────────────────────────────────────────

/**
 * Whether the mail module is switched on, and whether compose is — both from
 * scooba-service's App rows ('scooba-psu-mail' / 'scooba-psu-mail-compose',
 * see scooba-service/config/app-registry.js). The one mail call that goes to
 * scooba rather than Microsoft.
 *
 * Throws only when the gateway says the module is off — `requestJson` turns
 * its 503 ModuleDisabled into a MODULE_DISABLED-marked Error that `ErrorState`
 * already knows how to show. Any other failure keeps the last known compose
 * state: a network blip must neither block the inbox nor change which scopes
 * the next token refresh asks for. A gateway that predates the compose field
 * answers without it, which reads as off.
 */
export async function checkMailModule(): Promise<MailStatus> {
  if (MAIL_MOCK_ENABLED) {
    setMailComposeEnabled(true);
    return { compose: true };
  }

  try {
    const json = await requestJson<{ data?: { compose?: boolean } }>(ENDPOINTS.mailStatus);
    const compose = json?.data?.compose === true;
    setMailComposeEnabled(compose);
    return { compose };
  } catch (error) {
    if (isModuleDisabled(error)) throw error;
    return { compose: isMailComposeEnabled() };
  }
}

// ─── Reading ────────────────────────────────────────────────────────────────

/**
 * Graph refuses `$filter` + `$orderby` together unless every `$orderby`
 * property also appears in `$filter`, and first — hence the always-true
 * receivedDateTime clause ahead of the isRead one.
 */
function readFilterClause(filter: MailReadFilter) {
  if (filter === 'all') return '';
  return `receivedDateTime ge 1900-01-01T00:00:00Z and isRead eq ${filter === 'read'}`;
}

/**
 * One page of a folder, newest first. The read filter is applied by Graph,
 * not to the loaded page: filtering in JS would only ever see the pages
 * scrolled into so far and miss every older unread message.
 */
export async function listMessages(
  folder: MailFolderKey,
  { filter = 'all', top = 25, nextLink }: { filter?: MailReadFilter; top?: number; nextLink?: string } = {},
): Promise<{ messages: MailMessage[]; nextLink?: string }> {
  if (MAIL_MOCK_ENABLED) {
    // `nextLink` is Graph's opaque `@odata.nextLink` everywhere else; here it
    // is just a stringified offset into the fixture list.
    const cursor = nextLink ? Number(nextLink) : 0;
    const result = await mockListMessages(folder, { filter, top, cursor });
    return {
      messages: result.messages,
      nextLink: result.nextCursor != null ? String(result.nextCursor) : undefined,
    };
  }

  let url = nextLink;
  if (!url) {
    const params = [
      `$top=${top}`,
      `$select=${LIST_SELECT}`,
      `$orderby=${encodeURIComponent('receivedDateTime desc')}`,
    ];
    const clause = readFilterClause(filter);
    if (clause) params.push(`$filter=${encodeURIComponent(clause)}`);
    url = `${folderMessagesUrl(folder)}?${params.join('&')}`;
  }

  const json = await graphFetch<GraphListResponse>(url);
  return {
    messages: (json.value ?? []).map(toMailMessage),
    nextLink: json['@odata.nextLink'],
  };
}

/**
 * Full-text search — subject, sender and body — within one folder, via
 * Graph's own `$search`, for the same reason `listMessages` filters
 * server-side.
 *
 * No `nextLink` and no read filter: Graph ranks `$search` hits by relevance
 * and won't combine `$search` with `$filter` or `$orderby` on messages. The
 * top 25 already answers "did I find it", so the caller applies the read
 * filter to those in memory (see `applyReadFilter`).
 */
export async function searchMessages(
  folder: MailFolderKey,
  query: string,
  { top = 25 }: { top?: number } = {},
): Promise<{ messages: MailMessage[] }> {
  if (MAIL_MOCK_ENABLED) {
    const result = await mockSearchMessages(folder, query);
    return { messages: result.messages.slice(0, top) };
  }

  // A bare `"` would break out of the quoted $search term below — Graph's own
  // OData query, not HTML, so this is quote-stripping, not escaping.
  const safeQuery = query.replace(/"/g, '').trim();
  if (!safeQuery) return { messages: [] };

  const url =
    `${folderMessagesUrl(folder)}` +
    `?$search=${encodeURIComponent(`"${safeQuery}"`)}&$top=${top}&$select=${LIST_SELECT}`;

  const json = await graphFetch<GraphListResponse>(url);
  return { messages: (json.value ?? []).map(toMailMessage) };
}

export function applyReadFilter(messages: MailMessage[], filter: MailReadFilter): MailMessage[] {
  if (filter === 'all') return messages;
  const wantRead = filter === 'read';
  return messages.filter((message) => message.isRead === wantRead);
}

export async function getMessage(id: string): Promise<MailMessage> {
  if (MAIL_MOCK_ENABLED) return mockGetMessage(id);

  const url = `${GRAPH}/me/messages/${encodeURIComponent(id)}?$select=${DETAIL_SELECT}`;
  const json = await graphFetch<GraphMessage>(url);
  return toMailMessage(json);
}

/** For the count on the Inbox chip. */
export async function getInboxUnreadCount(): Promise<number> {
  if (MAIL_MOCK_ENABLED) return mockInboxUnreadCount();

  const json = await graphFetch<{ unreadItemCount?: number }>(
    `${GRAPH}/me/mailFolders/inbox?$select=unreadItemCount`,
  );
  return Number(json?.unreadItemCount ?? 0);
}

// ─── Writing (needs the compose scopes) ─────────────────────────────────────

/** Opening an unread message marks it read in Outlook too, as every mail client does. */
export async function markMessageRead(id: string): Promise<void> {
  if (MAIL_MOCK_ENABLED) return mockMarkRead(id);

  await graphFetch(`${GRAPH}/me/messages/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: { isRead: true },
  });
}

// Graph's own reply/forward actions rather than a fresh message with "RE:"
// in front: they keep the message in its conversation thread and append the
// quoted original server-side, exactly as Outlook would.
const SEND_ACTION = { reply: 'reply', replyAll: 'replyAll', forward: 'forward' } as const;
const DRAFT_ACTION = { reply: 'createReply', replyAll: 'createReplyAll', forward: 'createForward' } as const;

function isResponseMode(mode: ComposeMode): mode is 'reply' | 'replyAll' | 'forward' {
  return mode === 'reply' || mode === 'replyAll' || mode === 'forward';
}

function draftFields(payload: ComposePayload) {
  return {
    subject: payload.subject,
    toRecipients: toGraphRecipients(payload.to),
    ccRecipients: toGraphRecipients(payload.cc),
    ...(payload.keepBody ? {} : { body: { contentType: 'Text', content: payload.body } }),
  };
}

function responseBody(payload: ComposePayload) {
  return {
    comment: payload.body,
    message: {
      subject: payload.subject,
      toRecipients: toGraphRecipients(payload.to),
      ccRecipients: toGraphRecipients(payload.cc),
    },
  };
}

export async function sendMessage(payload: ComposePayload): Promise<void> {
  if (MAIL_MOCK_ENABLED) return mockSend(payload);

  if (payload.draftId) {
    const id = encodeURIComponent(payload.draftId);
    await graphFetch(`${GRAPH}/me/messages/${id}`, { method: 'PATCH', body: draftFields(payload) });
    await graphFetch(`${GRAPH}/me/messages/${id}/send`, { method: 'POST' });
    return;
  }

  if (payload.sourceId && isResponseMode(payload.mode)) {
    const id = encodeURIComponent(payload.sourceId);
    await graphFetch(`${GRAPH}/me/messages/${id}/${SEND_ACTION[payload.mode]}`, {
      method: 'POST',
      body: responseBody(payload),
    });
    return;
  }

  await graphFetch(`${GRAPH}/me/sendMail`, {
    method: 'POST',
    body: { message: draftFields({ ...payload, keepBody: false }), saveToSentItems: true },
  });
}

/** Creates or updates a draft in Drafts; resolves to its id. */
export async function saveDraft(payload: ComposePayload): Promise<string> {
  if (MAIL_MOCK_ENABLED) return mockSaveDraft(payload);

  if (payload.draftId) {
    await graphFetch(`${GRAPH}/me/messages/${encodeURIComponent(payload.draftId)}`, {
      method: 'PATCH',
      body: draftFields(payload),
    });
    return payload.draftId;
  }

  if (payload.sourceId && isResponseMode(payload.mode)) {
    const created = await graphFetch<GraphMessage>(
      `${GRAPH}/me/messages/${encodeURIComponent(payload.sourceId)}/${DRAFT_ACTION[payload.mode]}`,
      { method: 'POST', body: responseBody(payload) },
    );
    return created.id;
  }

  const created = await graphFetch<GraphMessage>(`${GRAPH}/me/messages`, {
    method: 'POST',
    body: draftFields({ ...payload, keepBody: false }),
  });
  return created.id;
}

/** Deletes a draft — Exchange moves it to Deleted Items, it is not purged. */
export async function deleteDraft(draftId: string): Promise<void> {
  if (MAIL_MOCK_ENABLED) return mockDeleteDraft(draftId);

  await graphFetch(`${GRAPH}/me/messages/${encodeURIComponent(draftId)}`, { method: 'DELETE' });
}

// ─── Recipients ─────────────────────────────────────────────────────────────

function personToRecipient(person: Person): MailRecipient {
  const record = person as Record<string, unknown>;
  const str = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
  const thName = [str(record.FNAME_TH), str(record.SNAME_TH)].filter(Boolean).join(' ');
  const enName = [str(record.FNAME_ENG), str(record.SNAME_ENG)].filter(Boolean).join(' ');
  return {
    name: str(record.name) || str(record.fullName) || thName || enName,
    address: str(record.EMAIL) || str(record.email),
  };
}

/**
 * Autocomplete for the To/Cc fields, from the staff directory person-search
 * already uses — no extra Microsoft scope needed (Graph's own People API
 * would want People.Read). Covers directory staff only; anyone else is typed
 * in by address.
 */
export async function suggestRecipients(term: string): Promise<MailRecipient[]> {
  if (MAIL_MOCK_ENABLED) return mockSuggestRecipients(term);

  const people = await getPersonnelSuggestions(term);
  const seen = new Set<string>();
  const result: MailRecipient[] = [];
  for (const person of people) {
    const recipient = personToRecipient(person);
    const key = recipient.address.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(recipient);
    if (result.length >= 8) break;
  }
  return result;
}

// ─── Body text ──────────────────────────────────────────────────────────────

const HTML_ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
};

/**
 * A message body as plain text, for the composer — which edits plain text
 * only. Good enough for a draft's own words; tables and styling do not
 * survive, which is why compose.tsx leaves an untouched HTML body alone
 * (`keepBody`) and says so before anyone edits one.
 */
export function bodyAsPlainText(message: MailMessage): string {
  const body = message.body;
  if (!body) return message.bodyPreview;
  if (body.contentType === 'text') return body.content;

  return body.content
    .replace(/<(style|script|head)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z#0-9]+;/gi, (entity) => HTML_ENTITIES[entity.toLowerCase()] ?? entity)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

import { MAIL_AUTH } from '@/constants/mailAuth';
import { fetchWithTimeout } from '@/services/api';
import { getValidAccessToken } from '@/services/mailAuthService';

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

const LIST_SELECT = 'id,subject,from,receivedDateTime,isRead,bodyPreview';
const DETAIL_SELECT = `${LIST_SELECT},body`;

export async function listInboxMessages({
  top = 25,
  nextLink,
}: { top?: number; nextLink?: string } = {}): Promise<{ messages: MailMessage[]; nextLink?: string }> {
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

export async function getMessage(id: string): Promise<MailMessage> {
  const url = `${MAIL_AUTH.endpoints.graphBase}/me/messages/${encodeURIComponent(id)}?$select=${DETAIL_SELECT}`;
  const json = await graphFetch<GraphMessage>(url);
  return toMailMessage(json);
}

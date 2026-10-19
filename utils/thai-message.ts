/**
 * Server wording → something the person can read, in the language they picked.
 *
 * The upstream PHP apps and the gateway answer in English ("Insert absence
 * success", "Delete timestamp forget data success", "staff_id is required"),
 * and those strings used to reach the toast verbatim. Thai text passes through
 * untouched — it is the server's own sentence and usually the most specific
 * one there is ("อยู่นอกเครือข่ายคณะ"). In English the app's own Thai outcomes are
 * mapped to their English twins; a Thai sentence only the server knows is kept as is.
 */

import { TEXT } from '@/constants/text';
import { isThai } from '@/i18n/locale';
import { TH } from '@/i18n/th';

const THAI_CHAR = /[฀-๿]/;

const MESSAGE_KEYS = {
  SUCCESS: 'MSG_SUCCESS',
  SAVED: 'MSG_SAVED',
  UPDATED: 'MSG_UPDATED',
  DELETED: 'MSG_DELETED',
  CANCELLED: 'MSG_CANCELLED',
  APPROVED: 'MSG_APPROVED',
  REJECTED: 'MSG_REJECTED',
  SENT: 'MSG_SENT',
  UPLOADED: 'MSG_UPLOADED',
  FAILED: 'MSG_FAILED',
  CANNOT_CONNECT: 'MSG_CANNOT_CONNECT',
  TIMEOUT: 'MSG_TIMEOUT',
  SERVER_ERROR: 'MSG_SERVER_ERROR',
  REQUIRED: 'MSG_REQUIRED',
  INVALID: 'MSG_INVALID',
  NOT_FOUND: 'MSG_NOT_FOUND',
  FORBIDDEN: 'MSG_FORBIDDEN',
  DUPLICATE: 'MSG_DUPLICATE',
  OVERLAP: 'MSG_OVERLAP',
  FILE_TYPE: 'MSG_FILE_TYPE',
  FILE_TOO_LARGE: 'MSG_FILE_TOO_LARGE',
  CANNOT_OPEN_FILE: 'MSG_CANNOT_OPEN_FILE',
  USER_CANCELLED: 'MSG_USER_CANCELLED',
} as const;

type MessageName = keyof typeof MESSAGE_KEYS;

/**
 * The app's own wording for each outcome, in the language the person picked. Getters,
 * so the answer follows the language at the moment a message is shown.
 */
export const THAI_MESSAGE = {} as Record<MessageName, string>;
for (const name of Object.keys(MESSAGE_KEYS) as MessageName[]) {
  Object.defineProperty(THAI_MESSAGE, name, {
    enumerable: true,
    get: () => TEXT[MESSAGE_KEYS[name]],
  });
}

/** Thai wording the app itself produced earlier, mapped to the same outcome in English. */
function localiseKnownThai(text: string): string {
  if (isThai()) return text;
  for (const name of Object.keys(MESSAGE_KEYS) as MessageName[]) {
    if (TH[MESSAGE_KEYS[name]] === text) return TEXT[MESSAGE_KEYS[name]];
  }
  return text;
}

export function hasThai(text: string) {
  return THAI_CHAR.test(text);
}

/**
 * The message if it is already Thai, '' otherwise — for services, so a screen's
 * `result.message || TEXT.<specific Thai fallback>` picks its own fallback.
 */
export function thaiOnly(message: unknown) {
  const text = String(message ?? '').trim();
  return hasThai(text) ? localiseKnownThai(text) : '';
}

// Order matters: the first match wins, so the narrower phrases come first.
const ERROR_RULES: [RegExp, MessageName][] = [
  [/was cancell?ed/i, 'USER_CANCELLED'],
  [/network request failed|unable to connect|cannot connect|failed to fetch|econn|connection/i, 'CANNOT_CONNECT'],
  [/time(d)?\s?out|abort/i, 'TIMEOUT'],
  [/jpe?g|png|image type|file type/i, 'FILE_TYPE'],
  [/too large|larger than|file size|payload/i, 'FILE_TOO_LARGE'],
  [/open file/i, 'CANNOT_OPEN_FILE'],
  [/overlap|conflict|already (booked|reserved)|not available/i, 'OVERLAP'],
  [/duplicate|already exists?/i, 'DUPLICATE'],
  [/required|missing|empty/i, 'REQUIRED'],
  [/not found|no .*record|does not exist/i, 'NOT_FOUND'],
  [/unauthori[sz]ed|forbidden|permission|not allowed|access denied|signature|token/i, 'FORBIDDEN'],
  [/invalid|malformed|must be|bad request|validation/i, 'INVALID'],
  [/internal server|server error|server request failed|bad gateway|unavailable|502|503|500/i, 'SERVER_ERROR'],
];

const SUCCESS_RULES: [RegExp, MessageName][] = [
  [/delet|remov/i, 'DELETED'],
  [/cancel/i, 'CANCELLED'],
  [/reject|disapprov|not approv/i, 'REJECTED'],
  [/approv/i, 'APPROVED'],
  [/upload/i, 'UPLOADED'],
  [/updat|edit|chang|modif/i, 'UPDATED'],
  [/send|sent|submit/i, 'SENT'],
  [/insert|add|creat|save|book|record|stamp/i, 'SAVED'],
];

/** Any message the app is about to show, in the app language. */
export function toThaiMessage(message: string, type: 'success' | 'error' = 'success') {
  const text = String(message ?? '').trim();
  if (!text) return text;
  if (hasThai(text)) return localiseKnownThai(text);

  const rules = type === 'error' ? ERROR_RULES : SUCCESS_RULES;
  const hit = rules.find(([pattern]) => pattern.test(text));
  if (hit) return THAI_MESSAGE[hit[1]];

  return type === 'error' ? THAI_MESSAGE.FAILED : THAI_MESSAGE.SUCCESS;
}

/**
 * The booking cart — rooms picked but not yet booked.
 *
 * The booking website works this way already: its forms only fill
 * `$_SESSION['book']`, and nothing reaches tb_book until the cart page is
 * submitted. The app used to skip that step and write on the first tap, which
 * is wrong for the way people actually book a room — they pick a slot, go and
 * check a timetable, ask a colleague, and come back. Sometimes tomorrow.
 *
 * So this is the website's flow with its one real flaw removed: the website's
 * cart is a PHP session and dies with it, while this one is on the device and
 * survives closing the app.
 *
 * ---------------------------------------------------------------------------
 * A cart does NOT hold a room
 *
 * Nothing here reserves anything. Two people can hold the same room at the same
 * hour in their carts, and the second one to confirm is refused — by the create
 * endpoints, which re-check availability at the moment of writing and are the
 * only thing that can, since only they are inside the transaction.
 *
 * That is also why confirming replays the ordinary `create*` call rather than
 * anything cart-specific: the server does not need to know a cart exists, and
 * every rule it enforces today keeps working unchanged.
 * ---------------------------------------------------------------------------
 *
 * Storage is per staff id. Impersonating someone else in development
 * (DEV_STAFF_ID) must not show their drafts, and on a shared machine two people
 * signing into the web build must not either.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  createBooking,
  createPeriodBooking,
  createTermBooking,
  type CreateBookingInput,
  type CreatePeriodInput,
  type CreateTermInput,
} from './bookingRoomService';

const KEY_PREFIX = 'booking-room:cart:';

function storageKey(staffId: string) {
  return `${KEY_PREFIX}${staffId}`;
}

/**
 * What the cart row shows, captured when the item is added.
 *
 * A snapshot rather than something derived on the fly, because the payload
 * carries ids where the reader needs words: `room_id: "01090"` is what the
 * server wants and "ME245" is what a person recognises, and the form options
 * that translate between them are a fetch away. Re-fetching them to draw a list
 * would make the cart unreadable whenever the network is down — which is a
 * likely moment to be looking at a saved draft.
 *
 * It does mean a room renamed after the item was added still shows its old
 * name. That is a better failure than an empty row.
 */
export type CartSummary = {
  /** Subject code, or the free-text subject of an "อื่นๆ" booking. */
  title: string;
  /** Second line — the purpose of the booking. */
  subtitle: string;
  teacher: string;
  /** Room names, deduplicated. */
  rooms: string[];
  /** One line per date or per weekday, already worded for display. */
  when: string[];
  /** How many tb_bookdetail rows confirming this would write. */
  slotCount: number;
  /**
   * The last date this draft would book, YYYY-MM-DD.
   *
   * Kept so a draft can be told it has gone stale without asking the server.
   * A cart is allowed to sit for days, and a date that has passed cannot be
   * booked — the server refuses it, and there is no reason to let someone reach
   * that refusal by tapping confirm.
   */
  lastDate: string;
};

type CartItemBase = {
  id: string;
  /** ISO timestamp, for "เพิ่มเมื่อ …" and for ordering. */
  addedAt: string;
  summary: CartSummary;
};

/**
 * One draft booking, holding the exact payload its create call takes.
 *
 * Storing the payload whole — rather than the form's own state — is what keeps
 * confirming honest: what gets sent is what the form would have sent, with no
 * second copy of the mapping between them to drift.
 */
export type CartItem =
  | (CartItemBase & { kind: 'general'; payload: CreateBookingInput })
  | (CartItemBase & { kind: 'term'; payload: CreateTermInput })
  | (CartItemBase & { kind: 'period'; payload: CreatePeriodInput });

export type NewCartItem =
  | { kind: 'general'; payload: CreateBookingInput; summary: CartSummary }
  | { kind: 'term'; payload: CreateTermInput; summary: CartSummary }
  | { kind: 'period'; payload: CreatePeriodInput; summary: CartSummary };

// ── Change notification ──────────────────────────────────────────────────────
//
// The cart badge sits in a header on screens that are not re-rendered by adding
// to the cart from somewhere else, so the count has to be pushed rather than
// polled. One listener set for the whole app: the cart is small and every
// subscriber wants the same thing.

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeToCart(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify() {
  listeners.forEach((listener) => listener());
}

async function write(staffId: string, items: CartItem[]) {
  await AsyncStorage.setItem(storageKey(staffId), JSON.stringify(items));
  notify();
}

/**
 * Everything in this person's cart, oldest first.
 *
 * Unreadable storage is treated as an empty cart rather than an error. The cart
 * is a convenience holding no irreplaceable data, and a screen that cannot open
 * because a draft from three versions ago will not parse is worse than losing
 * the draft.
 */
export async function listCart(staffId: string): Promise<CartItem[]> {
  if (!staffId) return [];

  try {
    const raw = await AsyncStorage.getItem(storageKey(staffId));
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    return [];
  }
}

export async function addToCart(staffId: string, item: NewCartItem): Promise<CartItem> {
  const entry = {
    ...item,
    // Date plus a random tail: two items added in the same millisecond is not a
    // realistic worry, but an id collision would silently delete the wrong row.
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    addedAt: new Date().toISOString(),
  } as CartItem;

  const items = await listCart(staffId);
  await write(staffId, [...items, entry]);

  return entry;
}

export async function removeFromCart(staffId: string, id: string): Promise<void> {
  const items = await listCart(staffId);
  await write(
    staffId,
    items.filter((item) => item.id !== id),
  );
}

export async function clearCart(staffId: string): Promise<void> {
  await AsyncStorage.removeItem(storageKey(staffId));
  notify();
}

/** Today as YYYY-MM-DD in local time — the same clock the dates were picked in. */
function today(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Whether every date this draft would book is in the past.
 *
 * ISO dates compare correctly as strings, which is why nothing is parsed here.
 */
export function isStale(item: CartItem): boolean {
  return Boolean(item.summary.lastDate) && item.summary.lastDate < today();
}

/**
 * Books one draft for real, and drops it from the cart once it exists.
 *
 * The removal is deliberately not in a `finally`: a draft that failed stays
 * exactly where it was, because the usual reason to fail is that somebody took
 * the room, and the answer to that is to edit the draft rather than to lose it.
 */
export async function confirmCartItem(staffId: string, item: CartItem): Promise<void> {
  switch (item.kind) {
    case 'general':
      await createBooking(item.payload);
      break;
    case 'term':
      await createTermBooking(item.payload);
      break;
    case 'period':
      await createPeriodBooking(item.payload);
      break;
  }

  await removeFromCart(staffId, item.id);
}

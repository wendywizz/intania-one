import { useSyncExternalStore } from 'react';

/**
 * Draft (unsaved) date/time slots for the meeting-room request form, kept
 * client-side while the wizard is open — same shape as
 * stores/draftMaterials.ts for notice-repair's add-material flow.
 *
 * meeting-room-date.tsx (the add/edit screen) writes here instead of holding
 * the value itself; meeting-room-form.tsx's step 1 reads it reactively via
 * `useDraftMeetingRoomDates`. Expo Router keeps the form screen mounted
 * underneath the date screen (a plain stack push), so no round-trip through
 * navigation params is needed — the store update alone is what the form sees
 * when it regains focus.
 *
 * A single unkeyed list, not a Record like draftMaterials: only one
 * meeting-room request can be under composition at a time (there is no
 * existing order id to key by — this *is* the not-yet-submitted request).
 */
export interface DraftMeetingRoomDate {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM */
  startTime: string;
  /** HH:MM */
  endTime: string;
}

const EMPTY: readonly DraftMeetingRoomDate[] = Object.freeze([]);

let store: DraftMeetingRoomDate[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDraftMeetingRoomDates(): readonly DraftMeetingRoomDate[] {
  return store;
}

export function getDraftMeetingRoomDate(id: string): DraftMeetingRoomDate | null {
  return store.find((row) => row.id === id) ?? null;
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Appends a new slot and returns its id. */
export function addDraftMeetingRoomDate(row: Omit<DraftMeetingRoomDate, 'id'>): string {
  const id = newId();
  store = [...store, { ...row, id }];
  emit();
  return id;
}

export function updateDraftMeetingRoomDate(id: string, row: Omit<DraftMeetingRoomDate, 'id'>) {
  store = store.map((r) => (r.id === id ? { ...row, id } : r));
  emit();
}

export function removeDraftMeetingRoomDate(id: string) {
  if (!store.some((r) => r.id === id)) return;
  store = store.filter((r) => r.id !== id);
  emit();
}

/** Called once the request is actually submitted (or the wizard is freshly
 *  entered) so a leftover draft from an abandoned attempt never leaks into
 *  the next one. */
export function clearDraftMeetingRoomDates() {
  if (store.length === 0) return;
  store = [];
  emit();
}

/** Reactive view of the current draft date/time list. */
export function useDraftMeetingRoomDates(): readonly DraftMeetingRoomDate[] {
  return useSyncExternalStore(subscribe, getDraftMeetingRoomDates, () => EMPTY);
}

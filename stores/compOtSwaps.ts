import { useSyncExternalStore } from 'react';

import { TEXT } from '@/constants/text';
import { getCompOtSwaps, type CompOtSwapRequest } from '@/services/compOtService';

/**
 * The caller's pending duty exchange/sale requests, shared by the comp-ot tabs.
 *
 * Three places read the same list: the roster tab (which of my shifts are
 * already in a request, so they show "pending" instead of the offer buttons),
 * the requests tab (the list itself) and the tab bar (how many wait for my
 * answer). Keeping one copy means answering a request on one tab is reflected
 * on the others without each re-fetching on its own schedule.
 */
export type CompOtSwapsState = {
  /** Who the list belongs to - a different signed-in user starts from empty. */
  staffId: string;
  requests: CompOtSwapRequest[];
  /** True only until the first answer for this user; later reloads keep the old list on screen. */
  isLoading: boolean;
  error: string;
};

const INITIAL: CompOtSwapsState = Object.freeze({ staffId: '', requests: [], isLoading: true, error: '' });

let state: CompOtSwapsState = INITIAL;
const listeners = new Set<() => void>();

function set(next: CompOtSwapsState) {
  state = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => state;

/** Fetch the list for `staffId`. Never throws - a failure is kept in `error`. */
export async function loadCompOtSwaps(staffId: string): Promise<void> {
  if (!staffId) return;
  if (state.staffId !== staffId) set({ ...INITIAL, staffId });

  try {
    const requests = await getCompOtSwaps(staffId);
    if (state.staffId === staffId) set({ staffId, requests, isLoading: false, error: '' });
  } catch (err) {
    if (state.staffId === staffId) {
      set({
        staffId,
        requests: [],
        isLoading: false,
        error: err instanceof Error ? err.message : TEXT.COMP_OT_SWAPS_LOAD_ERROR,
      });
    }
  }
}

export function useCompOtSwaps(): CompOtSwapsState {
  return useSyncExternalStore(subscribe, getSnapshot, () => INITIAL);
}

/** Requests addressed to the caller - the ones waiting for their answer. */
export function countIncomingCompOtSwaps(requests: readonly CompOtSwapRequest[]): number {
  return requests.filter((r) => r.direction === 'incoming').length;
}

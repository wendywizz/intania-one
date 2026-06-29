import { useSyncExternalStore } from 'react';

/**
 * Draft (unsaved) requisition materials, kept client-side per repair_id.
 *
 * The add-material screen pushes items here instead of hitting the API; the
 * detail screen reads them, shows a Save button, and persists the whole batch
 * via `addRequisition` (one POST /api/repair/requisition). This lets the user
 * stage several materials and commit them together.
 */
export interface DraftMaterial {
  name: string;
  number: string;
  unit: string;
  price_unit: string;
  price: string;
}

const EMPTY: readonly DraftMaterial[] = Object.freeze([]);

let store: Record<string, DraftMaterial[]> = {};
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

export function getDraftMaterials(repairId: string): readonly DraftMaterial[] {
  return store[repairId] ?? EMPTY;
}

export function addDraftMaterial(repairId: string, material: DraftMaterial) {
  store = { ...store, [repairId]: [...(store[repairId] ?? []), material] };
  emit();
}

export function clearDraftMaterials(repairId: string) {
  if (!(repairId in store)) return;
  const next = { ...store };
  delete next[repairId];
  store = next;
  emit();
}

/** Reactive view of the draft materials for a repair. */
export function useDraftMaterials(repairId: string): readonly DraftMaterial[] {
  return useSyncExternalStore(
    subscribe,
    () => getDraftMaterials(repairId),
    () => getDraftMaterials(repairId),
  );
}

// One-shot "scroll to the materials section" signal: the add-material screen
// raises it before navigating back, and the detail screen consumes it the next
// time it regains focus. Intentionally non-reactive (no re-render on its own).
const pendingScroll = new Set<string>();

export function requestScrollToMaterials(repairId: string) {
  pendingScroll.add(repairId);
}

export function consumeScrollToMaterials(repairId: string): boolean {
  return pendingScroll.delete(repairId);
}

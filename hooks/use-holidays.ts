import { useCallback, useRef, useState } from 'react';

import { getTimestampCalendar } from '@/services/timestampService';

// Holidays are sourced from the same endpoint the timestamp calendar uses
// (getTimestampCalendar → day.isHoliday / day.holidayName), so the absence form
// shows exactly the holidays the timestamp module does. Months are fetched
// lazily and cached so navigating the date picker only loads what it shows.

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export type HolidayData = {
  /** Set of 'YYYY-MM-DD' keys that are holidays. */
  holidaySet: Set<string>;
  /** Map of 'YYYY-MM-DD' -> holiday name. */
  holidayNames: Map<string, string>;
  /**
   * Ensure a given month's holidays are loaded (idempotent per staff+month).
   * Resolves once that month is available (immediately if already cached), so
   * callers can await it before revealing a calendar.
   */
  ensureMonth: (year: number, month: number) => Promise<void>;
  /** Ensure every month spanned by [start, end] is loaded. */
  ensureRange: (start: Date | null, end: Date | null) => Promise<void>;
  /** True when the date falls on a loaded holiday. */
  isHoliday: (date: Date) => boolean;
};

export function useHolidays(staffId: string): HolidayData {
  const [holidaySet, setHolidaySet] = useState<Set<string>>(() => new Set());
  const [holidayNames, setHolidayNames] = useState<Map<string, string>>(() => new Map());
  // Per-month fetch promises, so a month is never requested twice and callers
  // can await the same in-flight (or already-resolved) load.
  const monthPromises = useRef<Map<string, Promise<void>>>(new Map());

  const ensureMonth = useCallback(
    (year: number, month: number): Promise<void> => {
      if (!staffId) return Promise.resolve();
      const key = monthKey(year, month);
      const existing = monthPromises.current.get(key);
      if (existing) return existing;

      const promise = getTimestampCalendar(staffId, year, month)
        .then((calendar) => {
          const additions: [string, string][] = [];
          calendar.days.forEach((day) => {
            if (day.isHoliday && day.date) {
              additions.push([String(day.date).slice(0, 10), day.holidayName ?? '']);
            }
          });
          if (!additions.length) return;

          setHolidaySet((prev) => {
            const next = new Set(prev);
            additions.forEach(([dk]) => next.add(dk));
            return next;
          });
          setHolidayNames((prev) => {
            const next = new Map(prev);
            additions.forEach(([dk, name]) => next.set(dk, name));
            return next;
          });
        })
        .catch(() => {
          // Allow a later retry if the month failed to load.
          monthPromises.current.delete(key);
        });

      monthPromises.current.set(key, promise);
      return promise;
    },
    [staffId],
  );

  const ensureRange = useCallback(
    (start: Date | null, end: Date | null): Promise<void> => {
      if (!start) return Promise.resolve();
      const last = end ?? start;
      const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
      const endMonth = new Date(last.getFullYear(), last.getMonth(), 1);
      const pending: Promise<void>[] = [];
      while (cursor <= endMonth) {
        pending.push(ensureMonth(cursor.getFullYear(), cursor.getMonth() + 1));
        cursor.setMonth(cursor.getMonth() + 1);
      }
      return Promise.all(pending).then(() => undefined);
    },
    [ensureMonth],
  );

  const isHoliday = useCallback((date: Date) => holidaySet.has(dateKey(date)), [holidaySet]);

  return { holidaySet, holidayNames, ensureMonth, ensureRange, isHoliday };
}

/**
 * The signed-in person's booking cart, kept in step with storage.
 *
 * Every consumer subscribes to the same change notification, so adding a draft
 * on the จองทั่วไป form updates the badge in a header three screens away
 * without either of them knowing about the other.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import { listCart, subscribeToCart, type CartItem } from '@/services/bookingCartService';

export function useBookingCart() {
  const { user } = useAuth();
  const staffId = user?.staffId ?? '';

  const [items, setItems] = useState<CartItem[]>([]);
  // Starts true so a cart with rows in it does not flash its empty state first.
  const [loading, setLoading] = useState(true);

  // Read inside the subscription callback, which outlives any one render.
  const active = useRef(true);

  const read = useCallback(async () => {
    const next = staffId ? await listCart(staffId) : [];
    if (!active.current) return;
    setItems(next);
    setLoading(false);
  }, [staffId]);

  useEffect(() => {
    active.current = true;
    void read();

    const unsubscribe = subscribeToCart(() => void read());

    return () => {
      active.current = false;
      unsubscribe();
    };
  }, [read]);

  return { items, count: items.length, loading, staffId, reload: read };
}

/**
 * Booking Room → ตะกร้าจอง.
 *
 * Drafts held on this device, and the one screen that turns them into real
 * bookings. The website's index.php?main=book_view page by another name — its
 * cart lives in a PHP session and is gone by tomorrow, this one is not.
 *
 * The screen has one job beyond listing: making it impossible to believe the
 * rooms are already held. Hence the notice at the top, the wording on every
 * button, and the fact that confirming can fail per row and says so.
 */
import { useCallback, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { InfinityLoader } from '@/components/infinity-loader';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useToast } from '@/components/toast-provider';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useScreenGutter, useThemedStyles } from '@/constants/theme';
import { useBookingCart } from '@/hooks/use-booking-cart';
import {
  confirmCartItem,
  isStale,
  removeFromCart,
  type CartItem,
} from '@/services/bookingCartService';

/** Same three glyphs the type chooser uses, so a row points at the form that made it. */
const KIND_ICON: Record<CartItem['kind'], IconSymbolName> = {
  general: 'calendar',
  term: 'calendar-range',
  period: 'calendar-clock',
};

const KIND_LABEL: Record<CartItem['kind'], string> = {
  general: 'จองทั่วไป',
  term: 'จองรายเทอม',
  period: 'จองช่วงเวลา',
};


function fill(template: string, values: Record<string, string | number>) {
  return Object.keys(values).reduce(
    (text, key) => text.replace(`{${key}}`, String(values[key])),
    template,
  );
}

export default function BookingCartScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const gutter = useScreenGutter();
  const { showToast } = useToast();
  const { items, loading, staffId } = useBookingCart();

  /** Which row is being written right now, or 'all' during the whole-cart run. */
  const [busy, setBusy] = useState<string | null>(null);
  const [removing, setRemoving] = useState<CartItem | null>(null);
  const [confirming, setConfirming] = useState<CartItem | 'all' | null>(null);

  // Stale drafts cannot be booked, so they are excluded from "ยืนยันทั้งหมด"
  // rather than making it fail halfway down the list.
  const bookable = useMemo(() => items.filter((item) => !isStale(item)), [items]);

  const remove = useCallback(
    async (item: CartItem) => {
      await removeFromCart(staffId, item.id);
      setRemoving(null);
      showToast(TEXT.BOOKING_ROOM_CART_REMOVED, 'success');
    },
    [staffId, showToast],
  );

  const confirmOne = useCallback(
    async (item: CartItem) => {
      setBusy(item.id);
      setConfirming(null);

      try {
        await confirmCartItem(staffId, item);
        showToast(TEXT.BOOKING_ROOM_CART_CONFIRM_SUCCESS, 'success');
      } catch (err) {
        // The upstream's reason — "ห้องถูกจองแล้ว" and the like — is the useful
        // part and is shown as-is; the generic line is only the fallback.
        showToast(
          err instanceof Error ? err.message : TEXT.BOOKING_ROOM_CART_CONFIRM_ERROR,
          'error',
        );
      } finally {
        setBusy(null);
      }
    },
    [staffId, showToast],
  );

  /**
   * Books everything bookable, one at a time.
   *
   * Sequential on purpose: two drafts in the same cart can want the same room
   * at overlapping times, and firing them together would have the server decide
   * which one wins by whichever connection it happened to read first. One after
   * another, the second is refused for a reason the person can read.
   */
  const confirmAll = useCallback(async () => {
    setConfirming(null);
    setBusy('all');

    let ok = 0;
    let lastError = '';

    for (const item of bookable) {
      try {
        await confirmCartItem(staffId, item);
        ok += 1;
      } catch (err) {
        lastError = err instanceof Error ? err.message : '';
      }
    }

    setBusy(null);

    if (ok === bookable.length) {
      showToast(TEXT.BOOKING_ROOM_CART_CONFIRM_SUCCESS, 'success');
    } else if (ok > 0) {
      showToast(
        fill(TEXT.BOOKING_ROOM_CART_CONFIRM_PARTIAL, { ok, total: bookable.length }),
        'error',
      );
    } else {
      showToast(lastError || TEXT.BOOKING_ROOM_CART_CONFIRM_ERROR, 'error');
    }
  }, [bookable, staffId, showToast]);

  const renderItem = useCallback(
    ({ item }: { item: CartItem }) => {
      const stale = isStale(item);
      const working = busy === item.id || busy === 'all';

      return (
        <View style={[styles.card, stale && styles.cardStale]}>
          <View style={styles.cardHead}>
            <View style={styles.kindIcon}>
              <IconSymbol name={KIND_ICON[item.kind]} size={18} color={c.primary} />
            </View>
            <View style={styles.headText}>
              <View style={styles.kindBadge}>
                <ThemedText style={styles.kindBadgeText}>{KIND_LABEL[item.kind]}</ThemedText>
              </View>
              <ThemedText style={styles.title} numberOfLines={2}>
                {item.summary.title}
              </ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={TEXT.BOOKING_ROOM_CART_REMOVE}
              onPress={() => setRemoving(item)}
              disabled={working}
              hitSlop={8}
              style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}>
              <IconSymbol name="trash.fill" size={18} color={c.danger} />
            </Pressable>
          </View>

          {item.summary.subtitle ? (
            <ThemedText style={styles.subtitle} numberOfLines={2}>
              {item.summary.subtitle}
            </ThemedText>
          ) : null}

          <View style={styles.facts}>
            {item.summary.rooms.length > 0 ? (
              <Fact icon="door.open" text={item.summary.rooms.join(', ')} styles={styles} c={c} />
            ) : null}
            {item.summary.when.map((line) => (
              <Fact key={line} icon="clock.fill" text={line} styles={styles} c={c} />
            ))}
            {item.summary.slotCount > 1 ? (
              <Fact
                icon="calendar"
                text={fill(TEXT.BOOKING_ROOM_CART_SLOT_COUNT, {
                  count: item.summary.slotCount,
                })}
                styles={styles}
                c={c}
              />
            ) : null}
          </View>

          {stale ? (
            <View style={styles.staleRow}>
              <IconSymbol name="exclamationmark.triangle.fill" size={14} color={c.danger} />
              <ThemedText style={styles.staleText}>{TEXT.BOOKING_ROOM_CART_STALE}</ThemedText>
            </View>
          ) : (
            <Button
              title={TEXT.BOOKING_ROOM_CART_CONFIRM_ONE}
              onPress={() => setConfirming(item)}
              loading={busy === item.id}
              disabled={working}
              size="sm"
              fullWidth
            />
          )}
        </View>
      );
    },
    [busy, c, styles],
  );

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <Header />
        <View style={styles.centered}>
          <InfinityLoader size={60} />
        </View>
      </ThemedView>
    );
  }

  if (items.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <Header />
        <EmptyState
          preset="room"
          message={TEXT.BOOKING_ROOM_CART_EMPTY}
          description={TEXT.BOOKING_ROOM_CART_EMPTY_HINT}
          action={
            <Button
              title={TEXT.BOOKING_ROOM_CART_GO_BOOK}
              onPress={() => router.replace('/booking-room/select-booking')}
            />
          }
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Header />

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingHorizontal: gutter }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.notice}>
            <IconSymbol name="info.circle.fill" size={16} color={c.warning} />
            <ThemedText style={styles.noticeText}>{TEXT.BOOKING_ROOM_CART_NOTICE}</ThemedText>
          </View>
        }
      />

      {/* Only worth its own bar when there is more than one thing to confirm —
          with a single draft the button on the card is the same action, and two
          buttons saying it would read as two different ones. */}
      {bookable.length > 1 ? (
        <View style={[styles.bottomBar, { paddingHorizontal: gutter }]}>
          <Button
            title={fill(TEXT.BOOKING_ROOM_CART_CONFIRM_ALL, { count: bookable.length })}
            onPress={() => setConfirming('all')}
            loading={busy === 'all'}
            disabled={busy !== null}
            size="lg"
            fullWidth
          />
        </View>
      ) : null}

      <ConfirmDialog
        visible={removing !== null}
        icon="trash.fill"
        title={TEXT.BOOKING_ROOM_CART_REMOVE_TITLE}
        message={TEXT.BOOKING_ROOM_CART_REMOVE_MESSAGE}
        confirmLabel={TEXT.BOOKING_ROOM_CART_REMOVE}
        destructive
        onConfirm={() => removing && void remove(removing)}
        onCancel={() => setRemoving(null)}
      />

      <ConfirmDialog
        visible={confirming !== null}
        icon="door.open"
        title={TEXT.BOOKING_ROOM_CART_CONFIRM_TITLE}
        message={TEXT.BOOKING_ROOM_CART_CONFIRM_MESSAGE}
        confirmLabel={TEXT.BOOKING_ROOM_CONFIRM_ACTION}
        cancelLabel={TEXT.BOOKING_ROOM_CONFIRM_CANCEL}
        onConfirm={() => {
          if (confirming === 'all') void confirmAll();
          else if (confirming) void confirmOne(confirming);
        }}
        onCancel={() => setConfirming(null)}
      />
    </ThemedView>
  );
}

function Header() {
  return (
    <ScreenHeader
      title={TEXT.BOOKING_ROOM_CART_TITLE}
      backHref="/booking-room"
      titleInNavBar
      showHomeButton={false}
      tone="primary"
    />
  );
}

function Fact({
  icon,
  text,
  styles,
  c,
}: {
  icon: IconSymbolName;
  text: string;
  styles: ReturnType<typeof makeStyles>;
  c: AppColors;
}) {
  return (
    <View style={styles.fact}>
      <IconSymbol name={icon} size={14} color={c.textMuted} />
      <ThemedText style={styles.factText}>{text}</ThemedText>
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: { paddingTop: 16, paddingBottom: 120, gap: 12 },

    notice: {
      flexDirection: 'row',
      gap: 10,
      padding: 12,
      marginBottom: 4,
      borderRadius: 12,
      backgroundColor: c.warningSoft,
    },
    noticeText: { flex: 1, fontSize: 12, lineHeight: 18, color: c.textMuted },

    card: {
      gap: 10,
      padding: 14,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    // A draft that cannot be booked is drawn as a problem, not as a row that
    // happens to have a note on it.
    cardStale: { borderColor: c.danger, backgroundColor: c.dangerSoft },

    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    kindIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primarySoft,
    },
    headText: { flex: 1, gap: 5, alignItems: 'flex-start' },
    title: { fontSize: 15, lineHeight: 21, color: c.text, fontFamily: AppFonts.psuBold },
    // alignItems: 'flex-start' on the column above is what keeps this hugging
    // its text — a badge stretched to the card's width is a banner.
    kindBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 9999,
      backgroundColor: c.primarySoft,
    },
    kindBadgeText: {
      fontSize: 11,
      lineHeight: 16,
      color: c.primary,
      fontFamily: AppFonts.psuBold,
    },
    removeBtn: { padding: 6 },
    pressed: { opacity: 0.6 },

    subtitle: { fontSize: 13, lineHeight: 19, color: c.textMuted },

    facts: { gap: 6 },
    fact: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    factText: { flex: 1, fontSize: 13, lineHeight: 19, color: c.textMuted },

    staleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    staleText: { flex: 1, fontSize: 12, lineHeight: 18, color: c.danger },

    bottomBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingTop: 12,
      paddingBottom: 28,
      backgroundColor: c.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
  });

/**
 * The cart in the corner of every booking-room screen.
 *
 * Drafts are easy to forget — that is the whole point of being able to leave
 * one for a day — so the count has to be visible from wherever someone lands,
 * not only on the screen that created it. Goes in `rightContent` of
 * ScreenHeader, which reserves 116pt for it.
 *
 * A labelled pill rather than a bare glyph. A cart icon on its own is a
 * convention borrowed from shops, and in a room-booking app nobody is looking
 * for one: it reads as decoration until the day someone happens to tap it. The
 * word is what makes it findable, and the filled shape is what makes it look
 * like something to press rather than a status light.
 *
 * With an empty cart it stays put, quieter and without the count. Hiding it
 * would move every other control in the bar the moment a draft is added, and a
 * cart nobody can find until it already has something in it is a cart nobody
 * discovers.
 */
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { useBookingCart } from '@/hooks/use-booking-cart';

export function BookingCartButton({ tone = 'default' }: { tone?: 'default' | 'primary' }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { count } = useBookingCart();

  const onPrimary = tone === 'primary';
  // On a brand-coloured bar the pill is a translucent white so it belongs to
  // the bar; anywhere else it is the brand tint on the page's own surface.
  const contentColor = onPrimary ? '#FFFFFF' : c.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        count > 0 ? `${TEXT.BOOKING_ROOM_CART_TITLE} ${count}` : TEXT.BOOKING_ROOM_CART_TITLE
      }
      onPress={() => router.push('/booking-room/cart')}
      hitSlop={6}
      style={({ pressed }) => [
        styles.pill,
        onPrimary ? styles.pillOnPrimary : styles.pillOnSurface,
        count === 0 && styles.pillEmpty,
        pressed && styles.pressed,
      ]}>
      <IconSymbol name="cart" size={17} color={contentColor} />

      <ThemedText style={[styles.label, { color: contentColor }]} numberOfLines={1}>
        {TEXT.BOOKING_ROOM_CART_TITLE}
      </ThemedText>

      {count > 0 ? (
        <View style={styles.badge}>
          {/* Capped so a runaway cart cannot widen the pill enough to squeeze
              the screen title beside it. */}
          <ThemedText style={styles.badgeText}>{count > 99 ? '99+' : count}</ThemedText>
        </View>
      ) : null}
    </Pressable>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingLeft: 10,
      paddingRight: 8,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
    },
    pillOnPrimary: {
      backgroundColor: 'rgba(255, 255, 255, 0.18)',
      borderColor: 'rgba(255, 255, 255, 0.45)',
    },
    pillOnSurface: {
      backgroundColor: c.primarySoft,
      borderColor: c.primary,
    },
    // Present but not competing with the screen's own actions while there is
    // nothing in it.
    pillEmpty: { opacity: 0.75 },
    pressed: { opacity: 0.6 },

    label: { fontSize: 13, lineHeight: 17, fontFamily: AppFonts.psuBold },

    // Square by default so a single digit reads as a circle: the height is
    // fixed and the width only grows past it once the count needs two figures.
    // Letting padding set both dimensions made the box taller than it was wide
    // — a slightly egg-shaped badge.
    badge: {
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.danger,
    },
    // lineHeight tight to the digits rather than to the badge: the PSU face
    // carries tall Thai ascenders, so a line box sized for them puts the number
    // above centre inside the circle. A box that hugs the glyphs is then
    // centred by the flexbox above, which is where the centring belongs.
    badgeText: {
      fontSize: 11,
      lineHeight: 12,
      textAlign: 'center',
      includeFontPadding: false,
      color: '#FFFFFF',
    },
  });

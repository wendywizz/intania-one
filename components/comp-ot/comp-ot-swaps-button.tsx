/**
 * The way into the exchange/sale requests, in the corner of the roster screen.
 *
 * Labelled and always present, like the booking-room cart: a bare icon for a
 * feature nobody has used yet is invisible, and hiding it until a request
 * exists would mean nobody could find where to answer one. The count is the
 * requests waiting for the caller's answer - the only ones that need them to
 * act - so it doubles as the reminder that something is pending.
 */
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { useThemedStyles, type AppColors } from '@/constants/theme';

export function CompOtSwapsButton({ incomingCount }: { incomingCount: number }) {
  const styles = useThemedStyles(makeStyles);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        incomingCount > 0 ? `${TEXT.COMP_OT_SWAPS_BUTTON_A11Y} ${incomingCount}` : TEXT.COMP_OT_SWAPS_BUTTON_A11Y
      }
      onPress={() => router.push('/comp-ot/swaps')}
      hitSlop={6}
      style={({ pressed }) => [styles.pill, pressed && styles.pressed]}>
      <IconSymbol name="replace" size={17} color="#FFFFFF" />
      <ThemedText style={styles.label} numberOfLines={1}>
        {TEXT.COMP_OT_SWAPS_PILL}
      </ThemedText>

      {incomingCount > 0 ? (
        <View style={styles.badge}>
          <ThemedText style={styles.badgeText}>{incomingCount > 99 ? '99+' : incomingCount}</ThemedText>
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
      backgroundColor: 'rgba(255, 255, 255, 0.18)',
      borderColor: 'rgba(255, 255, 255, 0.45)',
    },
    pressed: { opacity: 0.6 },
    label: { fontSize: 13, lineHeight: 17, fontFamily: AppFonts.psuBold, color: '#FFFFFF' },
    badge: {
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.danger,
    },
    badgeText: {
      fontSize: 11,
      lineHeight: 15,
      textAlign: 'center',
      includeFontPadding: false,
      color: '#FFFFFF',
    },
  });

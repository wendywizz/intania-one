/**
 * Booking Room → เลือกประเภทการจอง.
 *
 * The same card list the absence module uses to pick a leave form — same shape,
 * same reading order — because it is the same decision: pick a form, then fill
 * it in. Reached from the dashed "จองห้อง" button on the bookings tab.
 *
 * The three types are tb_booktype's DAY / TERM / PERIOD on the booking website,
 * which is why there are exactly three and why the order matches the site's.
 */
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { AppFonts } from '@/constants/fonts';
import { boxShadow } from '@/constants/shadows';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useScreenGutter, useThemedStyles } from '@/constants/theme';

type BookingMenuItem = {
  title: string;
  description: string;
  href:
    | '/booking-room/general-booking'
    | '/booking-room/term-booking'
    | '/booking-room/period-booking';
  icon: IconSymbolName;
};

// All three are calendar glyphs — they are three ways of choosing dates, and
// pretending otherwise would make the icons argue with the labels. What tells
// them apart is the span each one draws: a day, a range, a range with a clock.
const bookingMenus: BookingMenuItem[] = [
  {
    title: TEXT.BOOKING_ROOM_GENERAL_TITLE,
    description: TEXT.BOOKING_ROOM_GENERAL_DESCRIPTION,
    href: '/booking-room/general-booking',
    icon: 'calendar',
  },
  {
    title: TEXT.BOOKING_ROOM_TERM_TITLE,
    description: TEXT.BOOKING_ROOM_TERM_DESCRIPTION,
    href: '/booking-room/term-booking',
    icon: 'calendar-range',
  },
  {
    title: TEXT.BOOKING_ROOM_PERIOD_TITLE,
    description: TEXT.BOOKING_ROOM_PERIOD_DESCRIPTION,
    href: '/booking-room/period-booking',
    icon: 'calendar-clock',
  },
];

export default function SelectBookingScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const gutter = useScreenGutter();

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader
        title={TEXT.BOOKING_ROOM_CREATE_NAV_TITLE}
        backHref="/booking-room"
        titleInNavBar
        showHomeButton={false}
        tone="primary"
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: gutter }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <ThemedText style={styles.screenTitle}>{TEXT.BOOKING_ROOM_CREATE_TITLE}</ThemedText>
          <ThemedText style={styles.screenDesc}>
            {TEXT.BOOKING_ROOM_CREATE_DESCRIPTION}
          </ThemedText>
        </View>

        <View style={styles.cardList}>
          {bookingMenus.map((menu) => (
            <Link key={menu.href} href={menu.href} asChild>
              <Pressable accessibilityRole="button" style={styles.card}>
                <View style={styles.iconBg}>
                  <IconSymbol name={menu.icon} size={22} color={c.text} />
                </View>
                <View style={styles.cardText}>
                  <ThemedText style={styles.cardTitle}>{menu.title}</ThemedText>
                  <ThemedText style={styles.cardDesc} numberOfLines={1}>
                    {menu.description}
                  </ThemedText>
                </View>
                <IconSymbol name="chevron.right" size={18} color={c.textFaint} />
              </Pressable>
            </Link>
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    scrollContent: { paddingTop: 28, paddingBottom: 32 },

    intro: { gap: 8, marginBottom: 20 },
    screenTitle: {
      fontSize: 22,
      lineHeight: 28,
      color: c.text,
      fontFamily: AppFonts.psuBold,
    },
    screenDesc: {
      fontSize: 14,
      lineHeight: 21,
      color: c.textMuted,
      fontFamily: AppFonts.psuRegular,
    },

    cardList: { gap: 12 },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      paddingVertical: 22,
      paddingHorizontal: 16,
      gap: 14,
      boxShadow: boxShadow(c.shadow, { y: 3, blur: 10, opacity: 0.06 }),
    },
    iconBg: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    cardText: { flex: 1, gap: 3 },
    cardTitle: {
      fontSize: 17,
      lineHeight: 23,
      color: c.text,
      fontFamily: AppFonts.psuBold,
    },
    cardDesc: {
      fontSize: 14,
      lineHeight: 19,
      color: c.textMuted,
      fontFamily: AppFonts.psuRegular,
    },
  });

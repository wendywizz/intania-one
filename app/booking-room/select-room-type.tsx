/**
 * Booking Room → เลือกประเภทห้อง.
 *
 * The one new screen this module's unification with meeting-room adds: the
 * "+เพิ่มการจอง" row on the current-bookings tab used to open select-booking.tsx
 * (the 3-card จองทั่วไป/จองเทอม/จองช่วง picker) directly. It now opens here
 * first — a person picks a room *kind*, and only classroom booking still has
 * a further choice of *style* underneath it.
 *
 * Same card-list shape as select-booking.tsx (and, before that, absence's own
 * form chooser) on purpose: it is the same kind of decision — pick a card,
 * land on that thing's own screen — so it should look like the same decision.
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

type RoomTypeMenuItem = {
  title: string;
  description: string;
  href: '/booking-room/select-booking' | '/booking-room/meeting-room-form';
  icon: IconSymbolName;
};

const roomTypeMenus: RoomTypeMenuItem[] = [
  {
    title: TEXT.BOOKING_ROOM_ADD_BOOKING,
    description: TEXT.MEETING_ROOM_HUB_CLASSROOM_DESCRIPTION,
    href: '/booking-room/select-booking',
    icon: 'door.open',
  },
  {
    title: TEXT.MEETING_ROOM_HUB_CARD_TITLE,
    description: TEXT.MEETING_ROOM_HUB_CARD_DESCRIPTION,
    href: '/booking-room/meeting-room-form',
    icon: 'presentation',
  },
];

export default function SelectRoomTypeScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const gutter = useScreenGutter();

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader
        title={TEXT.MEETING_ROOM_HUB_NAV_TITLE}
        backHref="/booking-room"
        titleInNavBar
        showHomeButton={false}
        tone="primary"
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: gutter }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <ThemedText style={styles.screenTitle}>{TEXT.MEETING_ROOM_HUB_TITLE}</ThemedText>
          <ThemedText style={styles.screenDesc}>{TEXT.MEETING_ROOM_HUB_DESCRIPTION}</ThemedText>
        </View>

        <View style={styles.cardList}>
          {roomTypeMenus.map((menu) => (
            <Link key={menu.href} href={menu.href} asChild>
              <Pressable accessibilityRole="button" style={styles.card}>
                <View style={styles.iconBg}>
                  <IconSymbol name={menu.icon} size={22} color={c.text} />
                </View>
                <View style={styles.cardText}>
                  <ThemedText style={styles.cardTitle}>{menu.title}</ThemedText>
                  <ThemedText style={styles.cardDesc} numberOfLines={2}>
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

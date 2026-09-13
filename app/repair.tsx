/**
 * แจ้งซ่อม hub — เลือกประเภทงานแจ้งซ่อม.
 *
 * The home menu used to carry two separate tiles, "แจ้งซ่อมคอม" and
 * "แจ้งซ่อมทั่วไป" (notice-repair, the สาธารณูปการ/facilities module), each
 * opening its own module directly. This screen replaces both tiles with one
 * ("แจ้งซ่อม") and asks which kind of repair first — everything past this
 * screen is untouched: repair-computer and notice-repair remain two fully
 * separate, standalone modules with their own management screens, roles, and
 * APIs. Only the entry link is shared.
 *
 * Same card-list shape as booking-room's select-room-type.tsx (and, before
 * that, select-booking.tsx) on purpose: it is the same kind of decision — pick
 * a card, land on that thing's own module — so it should look like one.
 */
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { AppFonts } from '@/constants/fonts';
import { boxShadow } from '@/constants/shadows';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useScreenGutter, useThemedStyles } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getActiveSummary } from '@/services/activeSummaryService';

type RepairModuleKey = 'notice-repair' | 'repair-computer';

type RepairTypeMenuItem = {
  key: RepairModuleKey;
  title: string;
  description: string;
  href: '/notice-repair' | '/repair-computer';
  icon: IconSymbolName;
};

const repairTypeMenus: RepairTypeMenuItem[] = [
  {
    key: 'notice-repair',
    title: TEXT.REPAIR_HUB_NOTICE_REPAIR_TITLE,
    description: TEXT.REPAIR_HUB_NOTICE_REPAIR_DESCRIPTION,
    href: '/notice-repair',
    icon: 'wrench.fill',
  },
  {
    key: 'repair-computer',
    title: TEXT.REPAIR_HUB_COMPUTER_TITLE,
    description: TEXT.REPAIR_HUB_COMPUTER_DESCRIPTION,
    href: '/repair-computer',
    icon: 'laptop',
  },
];

export default function RepairHubScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const gutter = useScreenGutter();
  const { user: authUser } = useAuth();

  // Same "does this module have outstanding work" signal the home grid's red
  // dot uses (buildShiftItems() in app/index.tsx), read straight off the same
  // endpoint so the two never disagree.
  const [pending, setPending] = useState<Record<RepairModuleKey, boolean>>({
    'notice-repair': false,
    'repair-computer': false,
  });

  useEffect(() => {
    const staffId = String(authUser?.staffId ?? '').trim();
    if (!staffId) return;
    const userId = String(authUser?.userId ?? authUser?.staffId ?? '').trim();

    let active = true;
    getActiveSummary(staffId, userId)
      .then((data) => {
        if (!active) return;
        const anyPending = (tasks?: { count: number }[]) => (tasks ?? []).some((t) => t.count > 0);
        // `noticeRepair` guarded like an optional field, not just cast as one:
        // a gateway that hasn't picked up buildNoticeRepairSummary yet omits it
        // entirely, same as bookingRoom did when that section was new.
        setPending({
          'repair-computer': !!data.repairComputer?.success && anyPending(data.repairComputer?.tasks),
          'notice-repair': !!data.noticeRepair?.success && anyPending(data.noticeRepair?.tasks),
        });
      })
      .catch(() => {
        // A dot that failed to load is just absent, same as the home grid's.
      });
    return () => { active = false; };
  }, [authUser?.staffId, authUser?.userId]);

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader
        title={TEXT.REPAIR_HUB_NAV_TITLE}
        backHref="/"
        titleInNavBar
        showHomeButton={false}
        tone="primary"
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: gutter }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <ThemedText style={styles.screenTitle}>{TEXT.REPAIR_HUB_TITLE}</ThemedText>
          <ThemedText style={styles.screenDesc}>{TEXT.REPAIR_HUB_DESCRIPTION}</ThemedText>
        </View>

        <View style={styles.cardList}>
          {repairTypeMenus.map((menu) => {
            const hasPending = pending[menu.key];
            return (
              <Link key={menu.href} href={menu.href} asChild>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={hasPending ? `${menu.title}, ${TEXT.HOME_MENU_PENDING_A11Y}` : menu.title}
                  style={styles.card}>
                  <View style={styles.iconBg}>
                    <IconSymbol name={menu.icon} size={22} color={c.text} />
                    {hasPending ? <View style={styles.badge} /> : null}
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
            );
          })}
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
    // Same badge geometry as the home grid's menuBadge, one size down to fit
    // this icon circle — a ring in the card colour keeps it legible where it
    // overlaps the circle's own edge.
    badge: {
      position: 'absolute',
      top: -1,
      right: -1,
      width: 11,
      height: 11,
      borderRadius: 6,
      backgroundColor: c.danger,
      borderWidth: 1.5,
      borderColor: c.surface,
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

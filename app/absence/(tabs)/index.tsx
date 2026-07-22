import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { type AppColors, useColors, useScreenGutter, useThemedStyles } from '@/constants/theme';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';

type IconName = 'cross.fill' | 'briefcase.fill' | 'sun.max.fill' | 'figure.child';

type AbsenceMenuItem = {
  title: string;
  description: string;
  href: '/absence/sick' | '/absence/business' | '/absence/relax' | '/absence/birth';
  icon: IconName;
};

const absenceMenus: AbsenceMenuItem[] = [
  {
    title: TEXT.ABSENCE_SICK_TITLE,
    description: TEXT.ABSENCE_SICK_DESCRIPTION,
    href: '/absence/sick',
    icon: 'cross.fill',
  },
  {
    title: TEXT.ABSENCE_BUSINESS_TITLE,
    description: TEXT.ABSENCE_BUSINESS_DESCRIPTION,
    href: '/absence/business',
    icon: 'briefcase.fill',
  },
  {
    title: TEXT.ABSENCE_RELAX_TITLE,
    description: TEXT.ABSENCE_RELAX_DESCRIPTION,
    href: '/absence/relax',
    icon: 'sun.max.fill',
  },
];

export default function ChooseAbsenceScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const gutter = useScreenGutter();
  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title="ยื่นลา" backHref="/" titleInNavBar />
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingHorizontal: gutter }]} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <ThemedText style={styles.screenTitle}>เลือกประเภทการลา</ThemedText>
          <ThemedText style={styles.screenDesc}>
            เลือกประเภทการลาที่ต้องการยื่น ระบบจะนำคุณไปยังแบบฟอร์ม
            สำหรับกรอกรายละเอียดและส่งคำขอลาของคุณ
          </ThemedText>
        </View>
        <View style={styles.cardList}>
          {absenceMenus.map((menu) => (
            <Link key={menu.title} href={menu.href} asChild>
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

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  scrollContent: {
    paddingTop: 28,
    paddingBottom: 32,
  },
  intro: {
    gap: 8,
    marginBottom: 20,
  },
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
  cardList: {
    gap: 12,
  },
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
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 1,
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
  cardText: {
    flex: 1,
    gap: 3,
  },
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

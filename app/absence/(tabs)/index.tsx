import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

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
  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title={TEXT.ABSENCE_TITLE} backHref="/" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ThemedText style={styles.subtitle}>{TEXT.ABSENCE_CHOOSE_SUBTITLE}</ThemedText>

        <View style={styles.cardList}>
          {absenceMenus.map((menu) => (
            <Link key={menu.title} href={menu.href} asChild>
              <Pressable accessibilityRole="button" style={styles.card}>
                <View style={styles.iconBg}>
                  <IconSymbol name={menu.icon} size={28} color={c.primary} />
                </View>
                <View style={styles.cardText}>
                  <ThemedText style={styles.cardTitle}>{menu.title}</ThemedText>
                  <ThemedText style={styles.cardDesc} numberOfLines={2}>
                    {menu.description}
                  </ThemedText>
                </View>
                <IconSymbol name="chevron.right" size={18} color={c.textFaint} style={{ alignSelf: 'center' }} />
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
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 32,
    gap: 20,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
  },
  cardList: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: c.surface,
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 16,
    gap: 16,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 4,
  },
  iconBg: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardText: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 21,
    color: c.text,
    fontFamily: AppFonts.psuBold,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
  },
});

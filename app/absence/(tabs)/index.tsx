import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { TEXT } from '@/constants/text';

type IconName = 'cross.fill' | 'briefcase.fill' | 'sun.max.fill' | 'figure.child';

type AbsenceMenuItem = {
  title: string;
  description: string;
  href: '/absence/sick' | '/absence/business' | '/absence/relax' | '/absence/birth';
  iconBg: string;
  iconColor: string;
  icon: IconName;
};

const absenceMenus: AbsenceMenuItem[] = [
  {
    title: TEXT.ABSENCE_SICK_TITLE,
    description: TEXT.ABSENCE_SICK_DESCRIPTION,
    href: '/absence/sick',
    iconBg: '#FFDAD7',
    iconColor: '#410005',
    icon: 'cross.fill',
  },
  {
    title: TEXT.ABSENCE_BUSINESS_TITLE,
    description: TEXT.ABSENCE_BUSINESS_DESCRIPTION,
    href: '/absence/business',
    iconBg: '#DDE2F3',
    iconColor: '#161C28',
    icon: 'briefcase.fill',
  },
  {
    title: TEXT.ABSENCE_RELAX_TITLE,
    description: TEXT.ABSENCE_RELAX_DESCRIPTION,
    href: '/absence/relax',
    iconBg: '#DAE3F4',
    iconColor: '#131C28',
    icon: 'sun.max.fill',
  },
];

export default function ChooseAbsenceScreen() {
  return (
    <ThemedView style={styles.container}>
      <NavTopBar
        title={TEXT.ABSENCE_TITLE}
        subtitle={TEXT.ABSENCE_TAB_APPEAL}
        moduleIcon="calendar-clock"
        backHref="/"
      />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <ThemedText style={styles.heading}>{TEXT.ABSENCE_CHOOSE_TITLE}</ThemedText>
          <ThemedText style={styles.subtitle}>{TEXT.ABSENCE_CHOOSE_SUBTITLE}</ThemedText>
        </View>

        <View style={styles.cardList}>
          {absenceMenus.map((menu) => (
            <Link key={menu.title} href={menu.href} asChild>
              <Pressable accessibilityRole="button" style={styles.card}>
                <View style={[styles.iconBg, { backgroundColor: menu.iconBg }]}>
                  <IconSymbol name={menu.icon} size={20} color={menu.iconColor} />
                </View>
                <View style={styles.cardText}>
                  <ThemedText style={styles.cardTitle}>{menu.title}</ThemedText>
                  <ThemedText style={styles.cardDesc}>{menu.description}</ThemedText>
                </View>
                <View style={styles.chevronWrap}>
                  <IconSymbol name="chevron.right" size={16} color="#585E6D" />
                </View>
              </Pressable>
            </Link>
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FD',
  },
  scrollContent: {
    padding: 16,
    gap: 24,
    paddingBottom: 32,
  },
  headerSection: {
    gap: 4,
  },
  heading: {
    fontSize: 20,
    lineHeight: 32,
    fontWeight: '600',
    letterSpacing: -0.24,
    color: '#191C1F',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#585E6D',
  },
  cardList: {
    gap: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(223, 191, 189, 0.3)',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 16,
  },
  iconBg: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    color: '#191C1F',
  },
  cardDesc: {
    fontSize: 14,
    lineHeight: 20,
    color: '#585E6D',
  },
  chevronWrap: {
    opacity: 0.4,
  },
  policyNote: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(218, 223, 240, 0.3)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DADFF0',
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'flex-start',
  },
  policyIconWrap: {
    paddingTop: 2,
  },
  policyContent: {
    flex: 1,
    gap: 4,
  },
  policyLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#585E6D',
  },
  policyText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#5D6371',
  },
});

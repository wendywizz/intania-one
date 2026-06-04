import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { TEXT } from '@/constants/text';

import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const absentMenus = [
  {
    title: TEXT.ABSENT_SICK_TITLE,
    description: 'ยื่นคำขอลาป่วย',
    href: '/absent/sick',
  },
  {
    title: TEXT.ABSENT_BUSINESS_TITLE,
    description: 'ยื่นคำขอไปราชการ',
    href: '/absent/business',
  },
  {
    title: TEXT.ABSENT_RELAX_TITLE,
    description: 'ยื่นคำขอลาพักผ่อน',
    href: '/absent/relax',
  },
  {
    title: TEXT.ABSENT_BIRTH_TITLE,
    description: 'ยื่นคำขอลาคลอด',
    href: '/absent/birth',
  },
] as const;

export default function AbsentScreen() {
  return (
    <ThemedView style={styles.container}>
      <NavTopBar title={TEXT.ABSENT_TITLE} backHref="/" />

      <View style={styles.content}>
        <ThemedText type="subtitle">{TEXT.ABSENT_TITLE}</ThemedText>
        <ThemedText style={styles.description}>{TEXT.ABSENT_REQUEST_TYPE_PROMPT}</ThemedText>

        <View style={styles.grid}>
          {absentMenus.map((menu, index) => (
            <Link key={`${String(menu.title)}-${index}`} href={menu.href} asChild>
              <Pressable accessibilityRole="button" style={styles.card}>
                <ThemedText type="defaultSemiBold">{menu.title}</ThemedText>
                <ThemedText style={styles.cardDescription}>{menu.description}</ThemedText>
              </Pressable>
            </Link>
          ))}
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  description: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 20,
  },
  card: {
    width: '48%',
    minHeight: 104,
    justifyContent: 'center',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D7E6EC',
  },
  cardDescription: {
    marginTop: 6,
    color: '#687076',
    fontSize: 12,
    lineHeight: 18,
  },
});

import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { TEXT } from '@/constants/text';

import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const absentMenus = [
  {
    title: TEXT.TITLE_2,
    description: 'ยื่นคำขอลาป่วย',
    href: '/absent/sick',
  },
  {
    title: TEXT.TITLE_3,
    description: 'ยื่นคำขอไปราชการ',
    href: '/absent/business',
  },
  {
    title: TEXT.TITLE_4,
    description: 'ยื่นคำขอลาพักผ่อน',
    href: '/absent/relax',
  },
  {
    title: TEXT.TITLE_5,
    description: 'ยื่นคำขอลาคลอด',
    href: '/absent/birth',
  },
] as const;

export default function AbsentScreen() {
  return (
    <ThemedView style={styles.container}>
      <NavTopBar title={TEXT.TITLE_6} />

      <View style={styles.content}>
        <ThemedText type="subtitle">{TEXT.TITLE_6}</ThemedText>
        <ThemedText style={styles.description}>{TEXT.TEXT}</ThemedText>

        <View style={styles.grid}>
          {absentMenus.map((menu) => (
            <Link key={menu.title} href={menu.href} asChild>
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
    padding: 24,
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
    backgroundColor: '#F3F8FB',
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

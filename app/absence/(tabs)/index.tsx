import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { TEXT } from '@/constants/text';

import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const absenceMenus = [
  {
    title: TEXT.absence_SICK_TITLE,
    description: 'ยื่นคำขอลาป่วย',
    href: '/absence/sick',
  },
  {
    title: TEXT.absence_BUSINESS_TITLE,
    description: 'ยื่นคำขอไปราชการ',
    href: '/absence/business',
  },
  {
    title: TEXT.absence_RELAX_TITLE,
    description: 'ยื่นคำขอลาพักผ่อน',
    href: '/absence/relax',
  },
  {
    title: TEXT.absence_BIRTH_TITLE,
    description: 'ยื่นคำขอลาคลอด',
    href: '/absence/birth',
  },
] as const;

export default function absenceScreen() {
  return (
    <ThemedView style={styles.container}>
      <NavTopBar title={TEXT.absence_TITLE} backHref="/" />

      <View style={styles.content}>
        <ThemedText type="subtitle">{TEXT.absence_TITLE}</ThemedText>
        <ThemedText style={styles.description}>{TEXT.absence_REQUEST_TYPE_PROMPT}</ThemedText>

        <View style={styles.grid}>
          {absenceMenus.map((menu, index) => (
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

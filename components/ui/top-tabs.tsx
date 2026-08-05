import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { type AppColors, useThemedStyles } from '@/constants/theme';

export type TopTabItem<K extends string = string> = {
  key: K;
  label: string;
};

export type TopTabsProps<K extends string = string> = {
  tabs: TopTabItem<K>[];
  activeKey: K;
  onChange: (key: K) => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * The strip of text tabs a screen puts under its nav bar to split its own
 * content — "รออนุมัติ / ประวัติ", "ลืมลงเวลา / ประวัติ", and so on.
 *
 * Distinct from the bottom tab bar, which expo-router owns and which moves
 * between routes: these switch a piece of state inside one route, so they are a
 * plain component rather than a navigator.
 *
 * Six screens had grown their own copy of this markup, and the copies had
 * drifted — 12px vs 14px of top padding, a 28px vs 40px indicator, a surface
 * background on three of them and not the other three. Anything that should
 * differ per screen belongs in a prop here rather than in a seventh copy.
 */
export function TopTabs<K extends string = string>({
  tabs,
  activeKey,
  onChange,
  style,
}: TopTabsProps<K>) {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={[styles.bar, style]}>
      {tabs.map((tab) => {
        const active = tab.key === activeKey;

        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={styles.tab}
            onPress={() => onChange(tab.key)}
          >
            <ThemedText style={[styles.label, active && styles.labelActive]}>
              {tab.label}
            </ThemedText>
            <View style={[styles.indicator, active && styles.indicatorActive]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      // Hairlines top and bottom so the strip reads as its own band, split from
      // the nav bar above and the content below.
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingTop: 12,
      gap: 8,
    },
    label: { fontSize: 14, fontWeight: '600', color: c.textFaint },
    labelActive: { color: c.primary },
    indicator: { height: 3, width: 32, borderRadius: 2, backgroundColor: 'transparent' },
    indicatorActive: { backgroundColor: c.primary },
  });

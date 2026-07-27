import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { SectionCard } from '@/components/section-card';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { AppFonts } from '@/constants/fonts';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

export type DetailRow = { label: string; value: string; icon?: IconSymbolName };

type DetailInfoCardProps = {
  /** Card header title. */
  title?: string;
  /** Content aligned to the right of the header (e.g. a status badge). */
  trailing?: ReactNode;
  /** Rows to show. Rows with an empty `value` are dropped. */
  rows: DetailRow[];
  style?: StyleProp<ViewStyle>;
};

// The stacked "icon + label above value" rows on their own, for callers that
// need them inside a card they already own. Empty-value rows are dropped and the
// last visible row has no bottom divider.
export function DetailRows({ rows, style }: { rows: DetailRow[]; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const visible = rows.filter((row) => row.value);
  if (!visible.length) return null;

  return (
    <View style={style}>
      {visible.map((row, index) => (
        <View
          key={row.label}
          style={[styles.row, index === visible.length - 1 ? styles.rowLast : undefined]}
        >
          {row.icon ? <IconSymbol name={row.icon} size={22} color={c.inverse} /> : null}
          <View style={styles.rowText}>
            <ThemedText style={styles.label}>{row.label}</ThemedText>
            <ThemedText style={styles.value}>{row.value}</ThemedText>
          </View>
        </View>
      ))}
    </View>
  );
}

// The shared "detail info" card used by the detail screens: a titled SectionCard
// of `DetailRows`. Renders nothing when every row is empty.
export function DetailInfoCard({ title, trailing, rows, style }: DetailInfoCardProps) {
  if (!rows.some((row) => row.value)) return null;

  return (
    <SectionCard title={title} trailing={trailing} style={style}>
      <DetailRows rows={rows} />
    </SectionCard>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    color: c.textFaint,
  },
  value: {
    fontFamily: AppFonts.psuRegular,
    fontSize: 15,
    lineHeight: 22,
    color: c.text,
  },
});

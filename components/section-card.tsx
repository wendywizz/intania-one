import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppFonts } from '@/constants/fonts';
import { type AppColors, useThemedStyles } from '@/constants/theme';

type SectionCardProps = {
  /** Optional card header shown at the top of the card. */
  title?: string;
  /** Optional content aligned to the right of the header (e.g. a status badge). */
  trailing?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

// Shared "file-upload" style card: a white surface with a hairline border and a
// soft shadow, plus an optional header row (title + trailing). Used across the
// absence screens so every card looks identical.
export function SectionCard({ title, trailing, children, style }: SectionCardProps) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.card, style]}>
      {title || trailing ? (
        <View style={styles.headerRow}>
          {title ? <ThemedText style={styles.title}>{title}</ThemedText> : <View style={styles.titleSpacer} />}
          {trailing}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  card: {
    backgroundColor: c.surface,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    color: c.text,
    fontFamily: AppFonts.psuBold,
  },
  titleSpacer: {
    flex: 1,
  },
});

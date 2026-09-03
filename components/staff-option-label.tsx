import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppFonts } from '@/constants/fonts';
import { type AppColors, useThemedStyles } from '@/constants/theme';

type StaffOptionLabelProps = {
  /** Job title line, e.g. "หัวหน้างานบริหารทั่วไป". */
  position?: string;
  /** Person's display name, shown in bold under the position. */
  name?: string;
  /** Highlights both lines when the option is the selected one. */
  selected?: boolean;
  /** Fallback single line used when neither position nor name resolves. */
  fallback?: string;
};

// Approver rows in the absence forms: the position reads first (wrapped to at
// most two lines, then ellipsized) with the person's name in bold under it.
// Shared so every absence screen renders the approver list identically.
export function StaffOptionLabel({
  position,
  name,
  selected,
  fallback,
}: StaffOptionLabelProps) {
  const styles = useThemedStyles(makeStyles);
  const selectedStyle = selected ? styles.selected : undefined;

  if (!position && !name) {
    return (
      <ThemedText
        style={[styles.name, styles.fallback, selectedStyle]}
        numberOfLines={2}
      >
        {fallback}
      </ThemedText>
    );
  }

  return (
    <View style={styles.container}>
      {position ? (
        <ThemedText
          style={[styles.position, selectedStyle]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {position}
        </ThemedText>
      ) : null}
      {name ? (
        <ThemedText style={[styles.name, selectedStyle]} numberOfLines={1}>
          {name}
        </ThemedText>
      ) : null}
    </View>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    gap: 2,
  },
  position: {
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
    fontSize: 13,
    lineHeight: 18,
  },
  name: {
    color: c.text,
    fontFamily: AppFonts.psuBold,
    fontSize: 14,
    lineHeight: 20,
  },
  // Only the standalone fallback line sits directly in the row and has to grow.
  fallback: {
    flex: 1,
  },
  selected: {
    color: c.primary,
  },
});

import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { Sheet } from '@/components/ui/sheet';
import { AppFonts } from '@/constants/fonts';
import { MAIL_READ_FILTER_LABEL, type MailReadFilter } from '@/constants/mailFolders';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

const OPTIONS: { value: MailReadFilter; icon: IconSymbolName }[] = [
  { value: 'all', icon: 'tray.fill' },
  { value: 'unread', icon: 'envelope.fill' },
  { value: 'read', icon: 'envelope.open' },
];

/** The filter button's menu. A 'pop' sheet: three short choices, where a
 * full-height slide would weigh more than the decision does. */
export function MailFilterSheet({
  visible,
  value,
  onSelect,
  onMarkAllRead,
  onClose,
}: {
  visible: boolean;
  value: MailReadFilter;
  onSelect: (filter: MailReadFilter) => void;
  /** Omitted when it is unavailable (compose switch off): no row. */
  onMarkAllRead?: () => void;
  onClose: () => void;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);

  return (
    <Sheet visible={visible} onClose={onClose} title={TEXT.MAIL_FILTER_TITLE} animation="pop" scroll={false}>
      <View style={styles.list}>
        {OPTIONS.map((option) => {
          const isSelected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelect(option.value)}
              style={({ pressed }) => [styles.row, isSelected ? styles.rowSelected : null, pressed ? styles.pressed : null]}
            >
              <IconSymbol name={option.icon} size={19} color={isSelected ? c.primary : c.textMuted} />
              <ThemedText style={[styles.label, isSelected ? { color: c.primary } : null]}>
                {MAIL_READ_FILTER_LABEL[option.value]}
              </ThemedText>
              {isSelected ? <IconSymbol name="checkmark" size={18} color={c.primary} /> : null}
            </Pressable>
          );
        })}
        {onMarkAllRead ? (
          <Pressable
            accessibilityRole="button"
            onPress={onMarkAllRead}
            style={({ pressed }) => [styles.row, styles.actionRow, pressed ? styles.pressed : null]}
          >
            <IconSymbol name="envelope.open" size={19} color={c.primary} />
            <ThemedText style={[styles.label, { color: c.primary }]}>{TEXT.MAIL_MARK_ALL_READ}</ThemedText>
          </Pressable>
        ) : null}
      </View>
    </Sheet>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  list: { gap: 6, paddingBottom: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: c.surfaceAlt,
  },
  actionRow: { marginTop: 8, backgroundColor: c.surface, borderWidth: 1, borderColor: c.primary },
  rowSelected: { backgroundColor: c.primarySoft },
  pressed: { opacity: 0.75 },
  label: {
    flex: 1,
    fontFamily: AppFonts.psuBold,
    fontSize: 14,
    // Explicit, not inherited from ThemedText's 20: the app-wide 1.5x floor in
    // utils/font-scale.ts only applies when a style sets both metrics, and at
    // 20 the tone mark stacked on "ทั้ง" (ทั้งหมด) was clipped on iPhone.
    lineHeight: 21,
    color: c.text,
  },
});

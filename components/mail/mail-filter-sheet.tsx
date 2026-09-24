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
  onClose,
}: {
  visible: boolean;
  value: MailReadFilter;
  onSelect: (filter: MailReadFilter) => void;
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
  rowSelected: { backgroundColor: c.primarySoft },
  pressed: { opacity: 0.75 },
  label: {
    flex: 1,
    fontFamily: AppFonts.psuBold,
    fontSize: 15,
    color: c.text,
  },
});

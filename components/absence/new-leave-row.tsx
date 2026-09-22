import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useScreenGutter, useThemedStyles } from '@/constants/theme';
import { navPush } from '@/utils/navigation';

/** Opens the leave-form chooser (/absence), which is a route but not a tab. */
export const openNewLeave = () => navPush('/absence' as Parameters<typeof navPush>[0]);

/**
 * The "ยื่นลา" row that sits above a list of leave cards — the way into the
 * leave forms, now that "ยื่นลา" is not a tab. Same dashed outline
 * booking-room uses for "จองห้อง": it reads as "start something new" rather
 * than as another item in the list below it.
 *
 * Callers decide when to show it: hidden while a request of this person's is
 * still waiting (one at a time), and hidden when the list is empty, where the
 * same action is drawn under the empty state's message instead.
 */
export function NewLeaveRow() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const gutter = useScreenGutter();

  return (
    <View style={[styles.addRow, { paddingHorizontal: gutter }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={TEXT.ABSENCE_NEW_LEAVE}
        onPress={openNewLeave}
        style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}>
        <IconSymbol name="plus" size={20} color={c.primary} />
        <ThemedText style={styles.addButtonText}>{TEXT.ABSENCE_NEW_LEAVE}</ThemedText>
      </Pressable>
    </View>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  // Sits between the nav bar and the list, so the list's own top padding is
  // measured from the button rather than from the navbar.
  addRow: {
    paddingTop: 16,
    paddingBottom: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 54,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: c.primary,
    backgroundColor: c.primarySoft,
    paddingHorizontal: 16,
  },
  addButtonPressed: { opacity: 0.7 },
  addButtonText: {
    color: c.primary,
    fontSize: 15,
    lineHeight: 21,
    fontFamily: AppFonts.psuBold,
  },
});

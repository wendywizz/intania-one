import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppFonts } from '@/constants/fonts';
import { MAIL_FOLDERS, type MailFolderKey } from '@/constants/mailFolders';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

/**
 * The folder row under the title — iOS Mail's category pills, carrying
 * Outlook's own folders. Scrolls sideways rather than wrapping: five labels
 * never fit a phone's width, and a second row would push the list down for
 * a control that is only touched now and then.
 */
export function MailFolderChips({
  selected,
  onSelect,
  inboxUnread,
}: {
  selected: MailFolderKey;
  onSelect: (folder: MailFolderKey) => void;
  /** Shown on the Inbox chip only — the one folder where "how many are
   * waiting" is a question anyone asks. Hidden at zero. */
  inboxUnread?: number;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      style={styles.row}
      contentContainerStyle={styles.rowContent}
    >
      {MAIL_FOLDERS.map((folder) => {
        const isSelected = folder.key === selected;
        const count = folder.key === 'inbox' ? inboxUnread ?? 0 : 0;
        const fg = isSelected ? c.textOnPrimary : c.text;

        return (
          <Pressable
            key={folder.key}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(folder.key)}
            style={({ pressed }) => [
              styles.chip,
              isSelected ? styles.chipSelected : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <IconSymbol name={folder.icon} size={15} color={isSelected ? c.textOnPrimary : c.textMuted} />
            <ThemedText style={[styles.label, { color: fg }]}>{folder.label}</ThemedText>
            {count > 0 ? (
              <View style={[styles.count, isSelected ? styles.countSelected : null]}>
                <ThemedText style={[styles.countText, isSelected ? { color: c.primary } : null]}>
                  {count > 99 ? '99+' : count}
                </ThemedText>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  // Bleeds past the screen's 16px side padding so the row scrolls edge to
  // edge, the way person-search's recent-keyword row does.
  row: { marginHorizontal: -16, flexGrow: 0 },
  rowContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: c.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  chipSelected: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  pressed: { opacity: 0.75 },
  label: {
    fontFamily: AppFonts.psuBold,
    fontSize: 13.5,
  },
  count: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.primary,
  },
  countSelected: { backgroundColor: c.textOnPrimary },
  countText: {
    fontFamily: AppFonts.psuBold,
    fontSize: 11,
    lineHeight: 14,
    color: c.textOnPrimary,
  },
});

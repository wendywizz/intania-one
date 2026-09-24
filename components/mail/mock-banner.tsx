import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { MAIL_MOCK_ENABLED } from '@/constants/mailAuth';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

/**
 * The one thing standing between "looks like a real inbox" and someone
 * mistaking fixture data for a real connection while testing on web — see
 * `MAIL_MOCK_ENABLED` in constants/mailAuth.ts. Renders nothing at all
 * outside that mode, so it is inert (not just invisible) in every real
 * build.
 */
export function MailMockBanner({ style }: { style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  if (!MAIL_MOCK_ENABLED) return null;

  return (
    <View style={[styles.banner, style]}>
      <IconSymbol name="flask" size={13} color={c.warningOnSoft} />
      <ThemedText style={styles.text}>{TEXT.MAIL_MOCK_BANNER}</ThemedText>
    </View>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: c.warningSoft,
  },
  text: {
    fontFamily: AppFonts.psuBold,
    fontSize: 11.5,
    color: c.warningOnSoft,
  },
});

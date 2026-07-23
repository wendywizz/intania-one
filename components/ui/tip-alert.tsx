import { Info } from 'lucide-react-native';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppFonts } from '@/constants/fonts';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

type TipAlertProps = {
  /** Optional bold heading above the message. */
  title?: string;
  /** The tip / note body text. */
  message: string;
  style?: StyleProp<ViewStyle>;
};

// Shared info/tip alert: an info-tinted card with a leading Info icon, an
// optional title, and a body message. Used for policy notes and tips across the
// app so every "note" looks identical. Font sizes match the absence form.
export function TipAlert({ title, message, style }: TipAlertProps) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.card, style]}>
      <View style={styles.iconWrap}>
        <Info size={20} color={c.info} />
      </View>
      <View style={styles.body}>
        {title ? <ThemedText style={styles.title}>{title}</ThemedText> : null}
        <ThemedText style={styles.message}>{message}</ThemedText>
      </View>
    </View>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: c.infoSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    borderRadius: 12,
    padding: 16,
  },
  iconWrap: {
    flexShrink: 0,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 15,
    lineHeight: 21,
    color: c.info,
    fontFamily: AppFonts.psuBold,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
  },
});

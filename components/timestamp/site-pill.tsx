import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui';
import { AppFonts } from '@/constants/fonts';
import { useColors } from '@/constants/theme';
import { scaleFont } from '@/utils/font-scale';

import { look, type SitePillProps } from './site-pill-look';

// What the pill says lives next door, clear of the icon set, so it can be
// tested on its own; the distance wording travels with it.
export { distanceLabel } from './site-pill-look';

/**
 * Where the phone is against the faculty fence, live — the one precondition a
 * person can do something about while standing there. Shared by the staff and
 * lecturer ลงเวลา cards, so both say it in the same words and colours.
 */
export function SitePill(props: SitePillProps) {
  const c = useColors();
  const { tone, icon, label, value } = look(props);

  const color =
    tone === 'success'
      ? c.success
      : tone === 'warning'
        ? c.warning ?? c.danger
        : tone === 'danger'
          ? c.danger
          : c.textMuted;

  return (
    <View style={[styles.pill, { backgroundColor: `${color}1A` }]}>
      <IconSymbol size={13} name={icon} color={color} />
      <ThemedText style={[styles.label, { color }]}>{label}</ThemedText>
      {/* The metres are what gets read at a glance, so they carry the weight
          while the words around them stay quiet. */}
      {value ? <ThemedText style={[styles.value, { color }]}>{value}</ThemedText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  label: {
    fontFamily: AppFonts.psuRegular,
    fontSize: scaleFont(12),
    lineHeight: scaleFont(18),
  },
  value: {
    fontFamily: AppFonts.psuBold,
    fontSize: scaleFont(13),
    fontVariant: ['tabular-nums'],
    lineHeight: scaleFont(18),
  },
});

import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { UserAvatar } from '@/components/user-avatar';
import { AppFonts } from '@/constants/fonts';
import { type AppColors, useThemedStyles } from '@/constants/theme';

// Avatar + name + position — the person line inside a detail screen's
// ผู้อนุมัติ / ผู้ขอ / ผู้ปฏิบัติแทน card. Same look as the screen-local copies in
// absence/detail, timestamp/*-detail and notice-repair/detail, which can move
// onto this one. `staffId` is the photo id; without it the placeholder shows.
export function PersonRow({
  name,
  position,
  staffId,
}: {
  name: string;
  position?: string;
  staffId?: string | number | null;
}) {
  const styles = useThemedStyles(makeStyles);
  if (!name && !position) return null;

  return (
    <View style={styles.row}>
      <UserAvatar staffId={staffId} size={44} />
      <View style={styles.text}>
        {name ? <ThemedText style={styles.name}>{name}</ThemedText> : null}
        {position ? <ThemedText style={styles.position}>{position}</ThemedText> : null}
      </View>
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    text: { flex: 1, gap: 3 },
    name: { fontFamily: AppFonts.psuBold, fontSize: 15, lineHeight: 21, color: c.text },
    position: { fontSize: 13, lineHeight: 18, color: c.textMuted },
  });

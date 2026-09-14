import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { useColors } from '@/constants/theme';
import type { LocationReading } from '@/services/deviceLocation';
import { scaleFont } from '@/utils/font-scale';

/**
 * How far away, in the unit that suits the number: metres while it is small
 * enough to mean something on foot, kilometres past 100 m, to two decimals at
 * most (4864 m -> '4.86 กม.'). Empty when there is no distance.
 */
export function distanceLabel(metres: number | null | undefined) {
  if (metres == null) return '';

  if (metres < 100) {
    return TEXT.STAFF_TIMESTAMP_METRES.replace('{m}', String(Math.round(metres)));
  }

  // Rounded to the nearest 10 m before the divide, so the two decimals are all
  // the precision there is — String() then drops a trailing zero by itself.
  return TEXT.STAFF_TIMESTAMP_KILOMETRES.replace('{km}', String(Math.round(metres / 10) / 100));
}

type SitePillProps = {
  /** The gateway's own verdict on the fence; null when no position was sent. */
  atSite: boolean | null | undefined;
  /** Metres from the fence centre, as the gateway measured them. */
  distanceM: number | null | undefined;
  /** The status reason, for an `off_site` refusal from an older gateway. */
  reason?: string;
  /** Why the phone did or did not give a fix. */
  location: LocationReading | null;
  /** A fix is still on its way: say so rather than show a stale answer. */
  locating?: boolean;
};

/**
 * Where the phone is against the faculty fence, live — the one precondition a
 * person can do something about while standing there. Shared by the staff and
 * lecturer ลงเวลา cards, so both say it in the same words and colours.
 *
 * It follows the gateway's measurement, never `reason` alone: a status reason is
 * the FIRST thing that stops a stamp, so somebody who already stamped is never
 * fence-checked and their reason says nothing at all about where they are.
 *
 * The phone is never told where the centre is; the distance comes back from
 * the server, which owns it.
 */
export function SitePill({ atSite, distanceM, reason, location, locating = false }: SitePillProps) {
  const c = useColors();

  const offSite = atSite === false || reason === 'off_site';
  const noFix = (location != null && location.outcome !== 'ok') || distanceM == null;

  const color = locating || noFix ? c.textMuted : offSite ? c.warning ?? c.danger : c.success;
  const state = locating
    ? TEXT.STAFF_TIMESTAMP_BADGE_LOCATING
    : noFix
      ? TEXT.STAFF_TIMESTAMP_NO_POSITION
      : offSite
        ? TEXT.STAFF_TIMESTAMP_OFF_SITE
        : TEXT.STAFF_TIMESTAMP_IN_AREA;
  const distance = locating ? '' : distanceLabel(distanceM);

  return (
    <View style={[styles.pill, { backgroundColor: `${color}1A` }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <ThemedText style={[styles.text, { color }]}>{state}</ThemedText>
      {distance ? <ThemedText style={[styles.text, { color }]}>{distance}</ThemedText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  dot: { borderRadius: 999, height: 7, width: 7 },
  text: {
    fontFamily: AppFonts.psuBold,
    fontSize: scaleFont(12),
    lineHeight: scaleFont(18),
  },
});

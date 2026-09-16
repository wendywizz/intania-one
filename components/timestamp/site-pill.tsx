import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol, type IconSymbolName } from '@/components/ui';
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

/**
 * Where amber turns red, as a share of the fence radius rather than a fixed
 * number of metres.
 *
 * Proportional because the radius is a setting: widen the fence and "nearly
 * there" should widen with it, or the colours would stop matching the rule they
 * describe. At 1.5x the radius still to walk, somebody is 2.5x the radius from
 * the centre — with today's 200 m fence that is amber up to 500 m out and red
 * beyond, which is the line that felt right when we looked at real distances.
 */
const FAR_RATIO = 1.5;

type SitePillProps = {
  /** The gateway's own verdict on the fence; null when no position was sent. */
  atSite: boolean | null | undefined;
  /** Metres from the fence centre, as the gateway measured them. */
  distanceM: number | null | undefined;
  /** The fence's radius in metres, as the gateway reported it. */
  radiusM?: number | null;
  /** The status reason, for an `off_site` refusal from an older gateway. */
  reason?: string;
  /** Why the phone did or did not give a fix. */
  location: LocationReading | null;
  /** A fix is still on its way: say so rather than show a stale answer. */
  locating?: boolean;
};

type Tone = 'success' | 'warning' | 'danger' | 'muted';

/** The pill's whole content: what it says, and the number it says it about. */
type Look = { tone: Tone; icon: IconSymbolName; label: string; value?: string };

/**
 * What the pill should say, from the gateway's measurements.
 *
 * It answers the question somebody standing outside actually has: **how much
 * further?** The gateway sends the distance from a centre the phone is never
 * told, plus the fence's radius; the difference is the walk that remains,
 * counting down to zero, where stamping becomes possible. A raw "4.86 กม." said
 * nothing about where the line was.
 *
 * It follows the gateway's measurement, never `reason` alone: a status reason is
 * the FIRST thing that stops a stamp, so somebody who already stamped is never
 * fence-checked and their reason says nothing at all about where they are.
 */
function look({ atSite, distanceM, radiusM, reason, location, locating }: SitePillProps): Look {
  if (locating) {
    return { tone: 'muted', icon: 'mappin', label: TEXT.STAFF_TIMESTAMP_BADGE_LOCATING };
  }

  const noFix = (location != null && location.outcome !== 'ok') || distanceM == null;
  if (noFix) {
    return { tone: 'muted', icon: 'mappin', label: TEXT.STAFF_TIMESTAMP_NO_POSITION };
  }

  if (atSite !== false && reason !== 'off_site') {
    return { tone: 'success', icon: 'checkmark.circle.fill', label: TEXT.STAFF_TIMESTAMP_IN_AREA };
  }

  // Outside. With a radius, say what is left to walk; without one — an older
  // gateway that sends no radius — fall back to the plain "outside" wording
  // rather than invent a number.
  if (radiusM == null) {
    return { tone: 'warning', icon: 'exclamationmark.triangle.fill', label: TEXT.STAFF_TIMESTAMP_OFF_SITE };
  }

  const over = Math.max(0, distanceM - radiusM);

  return over <= radiusM * FAR_RATIO
    ? { tone: 'warning', icon: 'mappin', label: TEXT.STAFF_TIMESTAMP_WALK_LEFT, value: distanceLabel(over) }
    : {
        tone: 'danger',
        icon: 'exclamationmark.triangle.fill',
        label: TEXT.STAFF_TIMESTAMP_TOO_FAR,
        value: distanceLabel(over),
      };
}

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

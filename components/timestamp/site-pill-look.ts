import type { IconSymbolName } from '@/components/ui';
import { TEXT } from '@/constants/text';
import type { LocationReading } from '@/services/deviceLocation';

/**
 * What the position pill should say, apart from the View that says it.
 *
 * Split from site-pill.tsx so the bands can be tested on their own: the
 * component pulls in the icon set, which is a hundred native modules deep and
 * will not load under jest, while this file is arithmetic and wording.
 */

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

/**
 * The radius to colour by when the gateway does not send one.
 *
 * An older gateway answers with a distance and no radius, and the pill used to
 * fall back to a plain "outside" with no number and a permanent amber — so
 * somebody two kilometres away was told the same thing, in the same colour, as
 * somebody one step past the line. The number is still real in that case (it is
 * measured from the centre, not from the fence), only the threshold is a guess,
 * and 200 m is the fence the faculty has set. The wording changes with it: it
 * says how far from the site, not how much further to walk.
 */
const FALLBACK_RADIUS_M = 200;

export type SitePillProps = {
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

export type Tone = 'success' | 'warning' | 'danger' | 'muted';

/** The pill's whole content: what it says, and the number it says it about. */
export type Look = { tone: Tone; icon: IconSymbolName; label: string; value?: string };

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
export function look({ atSite, distanceM, radiusM, reason, location, locating }: SitePillProps): Look {
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

  // Outside. With a radius, the number is the walk that remains and counts down
  // to zero; without one — an older gateway — it is the distance from the
  // centre, said in those words. Either way there is a number: "outside" on its
  // own tells somebody nothing about whether to start walking or to drive.
  const fence = radiusM ?? FALLBACK_RADIUS_M;
  const over = Math.max(0, distanceM - fence);
  const far = over > fence * FAR_RATIO;

  // The colour is the same judgement either way — it is only the NUMBER that
  // has to hedge: with a radius from the gateway the walk that remains is a
  // fact, without one it would be arithmetic on a guess, so the distance from
  // the site is shown instead and the wording says so.
  const label =
    radiusM == null
      ? TEXT.STAFF_TIMESTAMP_OFF_SITE
      : far
        ? TEXT.STAFF_TIMESTAMP_TOO_FAR
        : TEXT.STAFF_TIMESTAMP_WALK_LEFT;
  const value = distanceLabel(radiusM == null ? distanceM : over);

  return far
    ? { tone: 'danger', icon: 'exclamationmark.triangle.fill', label, value }
    : { tone: 'warning', icon: 'mappin', label, value };
}

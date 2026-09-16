/**
 * The position pill on both ลงเวลา screens: what it says, and in what colour.
 *
 * The rule it has to keep is that being outside always carries a number, and
 * that the number's colour matches how far outside that is — a phone two
 * kilometres away and a phone one step past the line must not look alike.
 */
import { distanceLabel, look } from '@/components/timestamp/site-pill-look';
import { TEXT } from '@/constants/text';

/** A fix that arrived and was fine; the pill only reads `outcome`. */
const fixed = { outcome: 'ok' } as never;

const pill = (over: Partial<Parameters<typeof look>[0]>) =>
  look({ atSite: false, distanceM: 0, radiusM: 200, location: fixed, ...over });

describe('distanceLabel', () => {
  it('stays in metres while the number means something on foot', () => {
    expect(distanceLabel(50)).toBe('50 ม.');
    expect(distanceLabel(99)).toBe('99 ม.');
  });

  it('turns to kilometres from 100 m up, to two decimals at most', () => {
    expect(distanceLabel(500)).toBe('0.5 กม.');
    expect(distanceLabel(2500)).toBe('2.5 กม.');
    expect(distanceLabel(4864)).toBe('4.86 กม.');
  });
});

describe('look', () => {
  it('is green inside the fence, with no distance to read', () => {
    const here = pill({ atSite: true, distanceM: 120 });

    expect(here.tone).toBe('success');
    expect(here.label).toBe(TEXT.STAFF_TIMESTAMP_IN_AREA);
    expect(here.value).toBeUndefined();
  });

  it('counts down the walk that remains, not the distance from the centre', () => {
    // 250 m out of a 200 m fence is 50 m still to walk.
    expect(pill({ distanceM: 250 }).value).toBe('50 ม.');
  });

  it('stays amber just past the line', () => {
    expect(pill({ distanceM: 201 }).tone).toBe('warning');
    expect(pill({ distanceM: 500 }).tone).toBe('warning');
  });

  it('turns red past 1.5x the radius still to walk', () => {
    expect(pill({ distanceM: 501 }).tone).toBe('danger');

    const far = pill({ distanceM: 2400 });
    expect(far.tone).toBe('danger');
    expect(far.value).toBe('2.2 กม.');
  });

  it('follows the radius, so a wider fence widens amber with it', () => {
    expect(pill({ distanceM: 900, radiusM: 400 }).tone).toBe('warning');
    expect(pill({ distanceM: 1100, radiusM: 400 }).tone).toBe('danger');
  });

  it('still shows a distance and reddens when the gateway sends no radius', () => {
    const far = pill({ distanceM: 2400, radiusM: null });

    expect(far.tone).toBe('danger');
    expect(far.label).toBe(TEXT.STAFF_TIMESTAMP_OFF_SITE);
    expect(far.value).toBe('2.4 กม.');
  });

  it('says it is looking rather than showing a stale answer', () => {
    expect(pill({ locating: true, distanceM: 2400 }).label).toBe(TEXT.STAFF_TIMESTAMP_BADGE_LOCATING);
  });

  it('says it has no position when the fix failed', () => {
    const blind = pill({ location: { outcome: 'denied' } as never, distanceM: null });

    expect(blind.label).toBe(TEXT.STAFF_TIMESTAMP_NO_POSITION);
  });
});

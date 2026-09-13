/**
 * The liveness check on the face-scan stamp.
 *
 * Readings are written out frame by frame at a phone's ~15 fps (every ~66 ms),
 * with probabilities of the kind ML Kit reports: ~0.95 for a wide-open eye,
 * ~0.05 for a closed one.
 */
import { createBlinkDetector, type EyeReading } from '@/utils/blink-detector';

const OPEN = 0.95;
const SHUT = 0.05;

/** Feed frames and return the indexes where a blink was reported. */
function blinksIn(frames: EyeReading[]) {
  const detector = createBlinkDetector();
  return frames.flatMap((frame, i) => (detector.push(frame) ? [i] : []));
}

function frames(eyes: [number | undefined, number | undefined][], startAt = 0, stepMs = 66): EyeReading[] {
  return eyes.map(([leftOpen, rightOpen], i) => ({ leftOpen, rightOpen, at: startAt + i * stepMs }));
}

describe('blink detector', () => {
  it('reports a real blink once, on the frame the eyes open again', () => {
    const blinks = blinksIn(
      frames([[OPEN, OPEN], [OPEN, OPEN], [SHUT, SHUT], [SHUT, SHUT], [OPEN, OPEN], [OPEN, OPEN]]),
    );

    expect(blinks).toEqual([4]);
  });

  it('never fires for a photo held with the eyes open', () => {
    const still = frames(Array.from({ length: 60 }, () => [OPEN, OPEN] as [number, number]));

    expect(blinksIn(still)).toEqual([]);
  });

  it('does not count a face that is first seen with its eyes shut', () => {
    // A photo of closed eyes swapped for one of open eyes is shut → open with no
    // open before it — not a blink.
    expect(blinksIn(frames([[SHUT, SHUT], [SHUT, SHUT], [OPEN, OPEN], [OPEN, OPEN]]))).toEqual([]);
  });

  it('requires both eyes — a wink is not a blink', () => {
    expect(blinksIn(frames([[OPEN, OPEN], [SHUT, OPEN], [SHUT, OPEN], [OPEN, OPEN]]))).toEqual([]);
  });

  it('does not count eyes shut for longer than a blink', () => {
    // Open, then shut for ~1.3 s, then open: dozing or looking down, not a blink.
    const shutLong = [[OPEN, OPEN], ...Array.from({ length: 20 }, () => [SHUT, SHUT]), [OPEN, OPEN]] as [number, number][];

    expect(blinksIn(frames(shutLong))).toEqual([]);
  });

  it('starts over when frames stop arriving, instead of guessing what happened', () => {
    // Open, closed, then a one-second gap (face lost / frames dropped), then open.
    const detector = createBlinkDetector();
    detector.push({ leftOpen: OPEN, rightOpen: OPEN, at: 0 });
    detector.push({ leftOpen: SHUT, rightOpen: SHUT, at: 66 });

    expect(detector.push({ leftOpen: OPEN, rightOpen: OPEN, at: 1100 })).toBe(false);
  });

  it('treats a frame with no eye reading as a reason to start over', () => {
    expect(blinksIn(frames([[OPEN, OPEN], [SHUT, SHUT], [undefined, undefined], [OPEN, OPEN]]))).toEqual([]);
  });

  it('ignores readings between the thresholds rather than letting them flip the state', () => {
    // Half-closed frames in the middle of a real blink change nothing.
    expect(blinksIn(frames([[OPEN, OPEN], [0.5, 0.5], [SHUT, SHUT], [0.5, 0.5], [OPEN, OPEN]]))).toEqual([4]);
  });

  it('counts two separate blinks separately', () => {
    const two = frames([[OPEN, OPEN], [SHUT, SHUT], [OPEN, OPEN], [OPEN, OPEN], [SHUT, SHUT], [OPEN, OPEN]]);

    expect(blinksIn(two)).toEqual([2, 5]);
  });

  it('forgets a half-finished blink after reset', () => {
    const detector = createBlinkDetector();
    detector.push({ leftOpen: OPEN, rightOpen: OPEN, at: 0 });
    detector.push({ leftOpen: SHUT, rightOpen: SHUT, at: 66 });
    detector.reset();

    expect(detector.push({ leftOpen: OPEN, rightOpen: OPEN, at: 132 })).toBe(false);
  });
});

/**
 * Blink detection for the face-scan stamp — the liveness check.
 *
 * FaceValid only answers "whose face is this". A printed photo or a picture on
 * another screen answers that just as well as a real face, so the scan screen
 * waits for a blink before it takes the picture it sends: a photograph can
 * hold its eyes open, and it can be held with them shut, but it cannot go from
 * one to the other.
 *
 * Fed with ML Kit's per-frame probabilities that each eye is open. A blink is
 * open → closed → open, with both eyes agreeing each time and the closed part
 * short enough to be a blink rather than eyes shut. Anything it cannot read —
 * no probability, frames too far apart — starts over rather than guessing, so
 * the failure mode is "blink again", never a pass.
 *
 * This runs on the phone and a modified app could skip it. It raises the bar
 * for the ordinary attempt; the server cannot check it after the fact.
 */

export type EyeReading = {
  /** Probability the left eye is open, 0..1; undefined when ML Kit could not tell. */
  leftOpen?: number;
  /** Probability the right eye is open, 0..1. */
  rightOpen?: number;
  /** When the frame was seen, in ms. */
  at: number;
};

export type BlinkDetectorOptions = {
  /** Both eyes at or above this count as open. */
  openAbove: number;
  /** Both eyes at or below this count as closed. The gap between the two is
   *  ignored, so a flickering reading near one threshold cannot fake a blink. */
  closedBelow: number;
  /** A closure longer than this is not a blink — eyes shut, or looking down. */
  maxClosedMs: number;
  /** Readings further apart than this start over: the face was lost, or frames
   *  were dropped, and what happened in between is unknown. */
  maxGapMs: number;
};

export const DEFAULT_BLINK_OPTIONS: BlinkDetectorOptions = {
  openAbove: 0.7,
  closedBelow: 0.3,
  maxClosedMs: 1000,
  maxGapMs: 700,
};

export type BlinkDetector = {
  /** Feed one frame's reading. True exactly once per completed blink. */
  push(reading: EyeReading): boolean;
  /** Forget everything seen so far — after a scan, or when the face is lost. */
  reset(): void;
};

type EyeState = 'open' | 'closed' | 'between' | 'unknown';

function readEyes(reading: EyeReading, options: BlinkDetectorOptions): EyeState {
  const { leftOpen, rightOpen } = reading;

  if (
    typeof leftOpen !== 'number' ||
    typeof rightOpen !== 'number' ||
    !Number.isFinite(leftOpen) ||
    !Number.isFinite(rightOpen)
  ) {
    return 'unknown';
  }

  if (leftOpen >= options.openAbove && rightOpen >= options.openAbove) return 'open';
  if (leftOpen <= options.closedBelow && rightOpen <= options.closedBelow) return 'closed';

  return 'between';
}

export function createBlinkDetector(
  options: BlinkDetectorOptions = DEFAULT_BLINK_OPTIONS,
): BlinkDetector {
  // 'waiting' = no open eyes seen yet, so a closure would not be a blink.
  let phase: 'waiting' | 'open' | 'closed' = 'waiting';
  let closedAt = 0;
  let lastAt = Number.NEGATIVE_INFINITY;

  return {
    push(reading) {
      if (reading.at - lastAt > options.maxGapMs) {
        phase = 'waiting';
      }
      lastAt = reading.at;

      const eyes = readEyes(reading, options);

      if (eyes === 'unknown') {
        phase = 'waiting';
        return false;
      }

      if (eyes === 'between') {
        return false;
      }

      if (phase === 'waiting') {
        // Only open eyes start a blink. Starting from closed would let a photo
        // of somebody with their eyes shut count the moment it is swapped for
        // one with them open.
        if (eyes === 'open') phase = 'open';
        return false;
      }

      if (phase === 'open') {
        if (eyes === 'closed') {
          phase = 'closed';
          closedAt = reading.at;
        }
        return false;
      }

      // phase === 'closed'
      if (eyes === 'closed') {
        if (reading.at - closedAt > options.maxClosedMs) phase = 'waiting';
        return false;
      }

      const isBlink = reading.at - closedAt <= options.maxClosedMs;
      phase = 'open';
      return isBlink;
    },

    reset() {
      phase = 'waiting';
      closedAt = 0;
      lastAt = Number.NEGATIVE_INFINITY;
    },
  };
}

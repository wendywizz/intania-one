export type StaffFaceScanStopReason = 'mismatch' | 'retry';

export type StaffFaceScanAttempt = {
  failedCount: number;
  stopped: boolean;
  stopReason: StaffFaceScanStopReason | null;
};

export const STAFF_FACE_SCAN_FAILURE_LIMIT = 2;

/** Record a scan refused by the face service and decide whether to pause. */
export function recordStaffFaceScanFailure(failedCount: number, reason: string): StaffFaceScanAttempt {
  const nextCount = failedCount + 1;
  return {
    failedCount: nextCount,
    stopped: nextCount >= STAFF_FACE_SCAN_FAILURE_LIMIT,
    stopReason:
      nextCount >= STAFF_FACE_SCAN_FAILURE_LIMIT
        ? reason === 'face_mismatch'
          ? 'mismatch'
          : 'retry'
        : null,
  };
}

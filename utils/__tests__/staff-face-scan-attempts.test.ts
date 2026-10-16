import { recordStaffFaceScanFailure } from '@/utils/staff-face-scan-attempts';

describe('staff face scan attempts', () => {
  it('stops after two no-face responses instead of retrying on every later blink', () => {
    const first = recordStaffFaceScanFailure(0, 'no_face');
    expect(first).toEqual({ failedCount: 1, stopped: false, stopReason: null });

    expect(recordStaffFaceScanFailure(first.failedCount, 'no_face')).toEqual({
      failedCount: 2,
      stopped: true,
      stopReason: 'retry',
    });
  });

  it('stops after two face mismatches and directs the person to update their face', () => {
    const first = recordStaffFaceScanFailure(0, 'face_mismatch');
    expect(first).toEqual({ failedCount: 1, stopped: false, stopReason: null });

    expect(recordStaffFaceScanFailure(first.failedCount, 'face_mismatch')).toEqual({
      failedCount: 2,
      stopped: true,
      stopReason: 'mismatch',
    });
  });

  it('also bounds retries rejected by the server scan interval', () => {
    const first = recordStaffFaceScanFailure(0, 'too_fast');
    expect(first).toEqual({ failedCount: 1, stopped: false, stopReason: null });

    expect(recordStaffFaceScanFailure(first.failedCount, 'too_fast')).toEqual({
      failedCount: 2,
      stopped: true,
      stopReason: 'retry',
    });
  });
});

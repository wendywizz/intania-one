/**
 * The server words a status in Thai; the badge shows it in the app language and picks
 * its colour from the same words. English counterparts are matched too, so a label
 * that ever arrives in English still lands on the right pill and colour.
 */
import { shortMeetingRoomStatus, getMeetingRoomStatusBadge } from '@/components/meeting-room/status-badge';
import { EN } from '@/i18n/en';
import { setCurrentLanguage } from '@/i18n/language';
import { TH } from '@/i18n/th';
import { isRetryableInitialError } from '@/utils/absence-form';

afterEach(() => setCurrentLanguage('th'));

describe('shortMeetingRoomStatus', () => {
  it('shortens the server\'s Thai sentence into the pill, in the app language', () => {
    const sentence = 'รออนุมัติจากผู้อนุมัติประจำหน่วยงานท่าน';
    expect(shortMeetingRoomStatus(sentence)).toBe(TH.MEETING_ROOM_STATUS_PENDING);
    setCurrentLanguage('en');
    expect(shortMeetingRoomStatus(sentence)).toBe(EN.MEETING_ROOM_STATUS_PENDING);
  });

  it('understands English wording for the same statuses', () => {
    setCurrentLanguage('en');
    expect(shortMeetingRoomStatus('Pending approval')).toBe(EN.MEETING_ROOM_STATUS_PENDING);
    expect(shortMeetingRoomStatus('Not approved by the unit')).toBe(EN.MEETING_ROOM_STATUS_REJECTED);
    expect(shortMeetingRoomStatus('Cancelled by staff')).toBe(EN.MEETING_ROOM_STATUS_CANCELLED);
  });

  it('keeps an unknown label as the server wrote it', () => {
    expect(shortMeetingRoomStatus('something new')).toBe('something new');
  });
});

describe('getMeetingRoomStatusBadge colours', () => {
  const GREEN = '#2ECC71';
  const YELLOW = '#F1C40F';
  const RED = '#E74C3C';

  it.each([
    ['ผู้อนุมัติประจำคณะอนุมัติแล้ว', GREEN],
    ['Approved', GREEN],
    ['รออนุมัติจากผู้อนุมัติประจำหน่วยงานท่าน', YELLOW],
    ['Pending', YELLOW],
    ['ไม่อนุมัติ', RED],
    // "approved" sits inside this one and must not turn it green.
    ['Not approved', RED],
    ['Cancelled', RED],
  ])('%s', (label, colour) => {
    expect(getMeetingRoomStatusBadge(label)?.bg).toBe(colour);
  });
});

describe('isRetryableInitialError', () => {
  it('treats the app\'s own load failures as retryable in either language', () => {
    expect(isRetryableInitialError(TH.SHARED_LOAD_FAILED)).toBe(true);
    expect(isRetryableInitialError(EN.SHARED_LOAD_FAILED)).toBe(true);
    expect(isRetryableInitialError(EN.SERVICE_ERROR_CANNOT_CONNECT)).toBe(true);
    expect(isRetryableInitialError(EN.SERVICE_ERROR_SERVER)).toBe(true);
    expect(isRetryableInitialError('Staff ID is required')).toBe(false);
  });
});

/**
 * What a toast says when the server answered in English — the upstream PHP
 * apps' wording is not under our control, so these are real strings they send.
 */
import { THAI_MESSAGE, thaiOnly, toThaiMessage } from '@/utils/thai-message';

describe('toThaiMessage', () => {
  it('leaves Thai wording alone', () => {
    expect(toThaiMessage('อยู่นอกเครือข่ายคณะ', 'error')).toBe('อยู่นอกเครือข่ายคณะ');
    expect(toThaiMessage('บันทึกแล้ว')).toBe('บันทึกแล้ว');
  });

  it('turns English success replies into Thai by what was done', () => {
    expect(toThaiMessage('Delete timestamp forget data success')).toBe(THAI_MESSAGE.DELETED);
    expect(toThaiMessage('Insert absence success')).toBe(THAI_MESSAGE.SAVED);
    expect(toThaiMessage('Profile updated successfully')).toBe(THAI_MESSAGE.UPDATED);
    expect(toThaiMessage('ok')).toBe(THAI_MESSAGE.SUCCESS);
  });

  it('turns English errors into Thai by cause', () => {
    expect(toThaiMessage('staff_id is required', 'error')).toBe(THAI_MESSAGE.REQUIRED);
    expect(toThaiMessage('Internal Server Error', 'error')).toBe(THAI_MESSAGE.SERVER_ERROR);
    expect(toThaiMessage('Network request failed', 'error')).toBe(THAI_MESSAGE.CANNOT_CONNECT);
    expect(toThaiMessage('file must be a JPEG or PNG image', 'error')).toBe(THAI_MESSAGE.FILE_TYPE);
    expect(toThaiMessage('Something odd', 'error')).toBe(THAI_MESSAGE.FAILED);
  });

  it('keeps an empty message empty so no toast is shown', () => {
    expect(toThaiMessage('')).toBe('');
  });
});

describe('thaiOnly', () => {
  it('drops English so the screen falls back to its own Thai text', () => {
    expect(thaiOnly('Insert success')).toBe('');
    expect(thaiOnly(undefined)).toBe('');
    expect(thaiOnly(' ส่งคำขอแล้ว ')).toBe('ส่งคำขอแล้ว');
  });
});

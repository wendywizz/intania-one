import { getDeviceLanguage } from '@/i18n/device-language';

const realDateTimeFormat = Intl.DateTimeFormat;

function phoneSpeaks(tag: string) {
  jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(
    () => ({ resolvedOptions: () => ({ locale: tag }) }) as unknown as Intl.DateTimeFormat,
  );
}

afterEach(() => {
  jest.restoreAllMocks();
  Intl.DateTimeFormat = realDateTimeFormat;
});

describe('getDeviceLanguage', () => {
  it.each(['th', 'th-TH', 'TH_th', 'th-TH-u-ca-buddhist'])('%s -> Thai', (tag) => {
    phoneSpeaks(tag);
    expect(getDeviceLanguage()).toBe('th');
  });

  it.each(['en-US', 'en-GB', 'ja-JP', 'de-DE', 'zh-Hans-CN'])('%s -> English', (tag) => {
    phoneSpeaks(tag);
    expect(getDeviceLanguage()).toBe('en');
  });

  it('falls back to Thai when the phone will not say', () => {
    phoneSpeaks('');
    expect(getDeviceLanguage()).toBe('th');
  });
});

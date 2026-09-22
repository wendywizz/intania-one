/**
 * When a notification arrived, as the notification list shows it ("x ago").
 *
 * Seam: the service's public interface — `registerForegroundNotificationHandler()`
 * wires the listeners, a push arrives, `getNotificationHistory()` reads it back.
 * Mocked only at the system boundaries: expo-notifications (the OS) and
 * AsyncStorage. Timestamps are literals, not derived the way the code derives them.
 *
 * Reported 2026-09-22: an approver's leave-request notification read "57 ปีที่แล้ว".
 * expo-notifications 57 reports `notification.date` in SECONDS on iOS and in
 * milliseconds on Android; read as milliseconds, an iPhone push was dated
 * 21 Jan 1970.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const received: ((notification: unknown) => void)[] = [];

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(null),
  AndroidImportance: { HIGH: 4 },
  addNotificationReceivedListener: jest.fn((listener) => {
    received.push(listener);
    return { remove: jest.fn() };
  }),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn().mockResolvedValue(null),
}));

// 2026-09-22 09:30 in Bangkok.
const ARRIVED_AT = '2026-09-22T02:30:00.000Z';
const ARRIVED_SECONDS = 1790044200;
const ARRIVED_MS = 1790044200000;

function push(date: number) {
  return {
    date,
    request: {
      identifier: `push-${date}`,
      content: { title: 'คำขอลางาน', body: 'มีคำขอลางานใหม่รอการอนุมัติ', data: { type: 'ABSENCE_new_request' } },
    },
  };
}

async function flush() {
  for (let i = 0; i < 5; i += 1) await new Promise<void>((resolve) => setImmediate(() => resolve()));
}

async function loadService(os: 'ios' | 'android') {
  Platform.OS = os;
  let service!: typeof import('@/services/notificationService');
  jest.isolateModules(() => {
    service = require('@/services/notificationService');
  });
  service.registerForegroundNotificationHandler();
  await flush();
  return service;
}

beforeEach(async () => {
  received.length = 0;
  await AsyncStorage.clear();
});

describe('the time a notification is shown as received', () => {
  it('is when it arrived on an iPhone, which reports seconds', async () => {
    const service = await loadService('ios');

    received.forEach((listener) => listener(push(ARRIVED_SECONDS)));
    await flush();

    const [item] = await service.getNotificationHistory();
    expect(item.receivedAt).toBe(ARRIVED_AT);
  });

  it('is when it arrived on Android, which reports milliseconds', async () => {
    const service = await loadService('android');

    received.forEach((listener) => listener(push(ARRIVED_MS)));
    await flush();

    const [item] = await service.getNotificationHistory();
    expect(item.receivedAt).toBe(ARRIVED_AT);
  });

  it('is repaired for history the previous build already saved as 1970', async () => {
    // What the old code stored for that iPhone push: seconds read as milliseconds.
    await AsyncStorage.setItem(
      'PUSH_NOTIFICATION_HISTORY',
      JSON.stringify([
        { id: 'old', title: 'คำขอลางาน', body: '', receivedAt: '1970-01-21T17:14:04.200Z', status: 'unread' },
      ]),
    );
    const service = await loadService('ios');

    const [item] = await service.getNotificationHistory();
    expect(item.receivedAt).toBe(ARRIVED_AT);
  });
});

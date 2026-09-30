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
// What the OS still shows in the notification tray.
const presented: unknown[] = [];

jest.mock('expo-notifications', () => ({
  getPresentedNotificationsAsync: jest.fn(async () => presented),
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
  presented.length = 0;
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

/*
 * Reported 2026-09-30: the repair-computer test pushes showed on the phone, but
 * the notification screen was empty. With the app in the background Android
 * draws an FCM push itself and no app code runs, so only a push that arrived
 * with the app open, or one that was tapped, ever reached the list.
 *
 * The shape below is what expo-notifications returns on Android for a push the
 * system drew: an identifier of its own carrying the FCM `tag`, and the Android
 * notification extras where the data would be.
 */
function trayPush(tag: string) {
  return {
    date: ARRIVED_MS,
    request: {
      identifier: `expo-notifications://foreign_notifications?tag=${tag}&id=0`,
      content: {
        title: 'งานซ่อมคอมพิวเตอร์',
        body: 'มีงานซ่อมใหม่มอบหมายให้คุณ',
        data: { 'android.title': 'งานซ่อมคอมพิวเตอร์', 'android.text': 'มีงานซ่อมใหม่มอบหมายให้คุณ' },
      },
    },
  };
}

function foregroundPush(tag: string) {
  return {
    date: ARRIVED_MS,
    request: {
      identifier: tag,
      content: {
        title: 'งานซ่อมคอมพิวเตอร์',
        body: 'มีงานซ่อมใหม่มอบหมายให้คุณ',
        data: { type: 'repair_computer_job_assigned', job_id: '3952', tag },
      },
    },
  };
}

describe('a push that arrived while the app was in the background', () => {
  it('is listed, unread, once the app is opened', async () => {
    presented.push(trayPush('m-1'));
    const service = await loadService('android');

    const items = await service.getNotificationHistory();

    expect(items).toEqual([
      expect.objectContaining({ title: 'งานซ่อมคอมพิวเตอร์', body: 'มีงานซ่อมใหม่มอบหมายให้คุณ', status: 'unread' }),
    ]);
    expect(await service.getUnreadNotificationCount()).toBe(1);
  });

  it('is listed once when the app also saw it arrive', async () => {
    const service = await loadService('android');
    received.forEach((listener) => listener(foregroundPush('m-1')));
    await flush();
    presented.push(trayPush('m-1'));

    const items = await service.getNotificationHistory();

    expect(items).toHaveLength(1);
    expect(items[0].data).toEqual(expect.objectContaining({ type: 'repair_computer_job_assigned', job_id: '3952' }));
  });

  it('stays read after it was opened, while it is still in the tray', async () => {
    const service = await loadService('android');
    presented.push(trayPush('m-1'));
    const [item] = await service.getNotificationHistory();
    await service.markNotificationRead(item.id);

    const [again] = await service.getNotificationHistory();

    expect(again.status).toBe('read');
  });
});

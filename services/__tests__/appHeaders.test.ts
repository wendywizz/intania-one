/**
 * T9 — the app/build/install headers sent to scooba-service (privacy §1.8).
 * Asserts the exact header set, that it only goes to API_BASE_URL, that a
 * caller's own header wins, and that the user-set device name never leaves.
 */
jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key: string) => (key in store ? store[key] : null)),
      setItem: jest.fn(async (key: string, value: string) => {
        store[key] = value;
      }),
      __store: store,
    },
  };
});
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    nativeAppVersion: '1.4.2',
    nativeBuildVersion: '37',
    deviceName: "Somchai's iPhone",
    expoConfig: { version: '1.4.2', extra: {} },
  },
}));
jest.mock('expo-device', () => ({ osVersion: '17.5' }));
jest.mock('expo-updates', () => ({ updateId: 'a1b2c3d4-0000-4000-8000-000000000001' }));
jest.mock('expo-crypto', () => {
  let n = 0;
  return { randomUUID: jest.fn(() => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`) };
});
jest.mock('@/constants/config', () => ({ ENV: { scoobaApiKey: 'test-key' } }));
jest.mock('../../constants/config', () => ({ ENV: { scoobaApiKey: 'test-key' } }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  INSTALL_ID_STORAGE_KEY,
  __resetAppHeadersForTests,
  appHeaders,
  loadInstallId,
  setHeaderStaffId,
} from '@/services/appHeaders';
import { API_BASE_URL, withApiToken } from '@/services/api';

const ALLOWED = [
  'X-Request-Id',
  'X-Staff-Id',
  'X-Install-Id',
  'X-App-Version',
  'X-Update-Id',
  'X-Platform',
  'X-OS-Version',
];

beforeEach(() => {
  __resetAppHeadersForTests();
  const store = (AsyncStorage as unknown as { __store: Record<string, string> }).__store;
  for (const key of Object.keys(store)) delete store[key];
});

describe('appHeaders', () => {
  it('sends only the §1.8 header set, never the device name', async () => {
    await loadInstallId();
    setHeaderStaffId('0012345');
    const headers = appHeaders();

    expect(Object.keys(headers).sort()).toEqual([...ALLOWED].sort());
    expect(headers['X-App-Version']).toBe('1.4.2+37');
    expect(headers['X-Update-Id']).toBe('a1b2c3d4-0000-4000-8000-000000000001');
    expect(headers['X-Platform']).toBe(Platform.OS);
    expect(headers['X-OS-Version']).toBe('17.5');
    expect(headers['X-Staff-Id']).toBe('0012345');
    expect(JSON.stringify(headers)).not.toContain('Somchai');
  });

  it('creates the install id once and keeps it', async () => {
    const first = await loadInstallId();
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(await AsyncStorage.getItem(INSTALL_ID_STORAGE_KEY)).toBe(first);

    __resetAppHeadersForTests();
    expect(await loadInstallId()).toBe(first);
  });

  it('gives each request its own X-Request-Id and drops staff id on sign-out', async () => {
    setHeaderStaffId('0012345');
    const a = appHeaders()['X-Request-Id'];
    const b = appHeaders()['X-Request-Id'];
    expect(a).not.toBe(b);

    setHeaderStaffId(null);
    expect(appHeaders()['X-Staff-Id']).toBeUndefined();
  });

  it('omits X-Install-Id until it has loaded', () => {
    expect(appHeaders()['X-Install-Id']).toBeUndefined();
  });
});

describe('withApiToken', () => {
  it('adds token and app headers for scooba-service', async () => {
    await loadInstallId();
    const init = withApiToken(`${API_BASE_URL}/health`, { method: 'GET' });
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer test-key');
    expect(headers['X-Install-Id']).toBeTruthy();
    expect(headers['X-App-Version']).toBe('1.4.2+37');
  });

  it('sends nothing to other hosts', () => {
    const init = { method: 'GET' };
    expect(withApiToken('https://news.example.org/feed', init)).toBe(init);
  });

  it("keeps the caller's own Authorization and headers", () => {
    const init = withApiToken(`${API_BASE_URL}/x`, {
      headers: { authorization: 'Bearer user', 'X-Request-Id': 'mine' },
    });
    const headers = init?.headers as Record<string, string>;
    expect(headers.authorization).toBe('Bearer user');
    expect(headers.Authorization).toBeUndefined();
    expect(headers['X-Request-Id']).toBe('mine');
  });
});

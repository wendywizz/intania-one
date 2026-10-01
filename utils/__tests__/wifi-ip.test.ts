/**
 * currentWifiIp() — above all, that iOS never reaches expo-network's own
 * getIpAddressAsync, the call that crashed the app natively after a scan.
 */
import { Platform } from 'react-native';

import { currentWifiIp } from '@/utils/wifi-ip';

function runningOn(os: 'ios' | 'android') {
  jest.replaceProperty(Platform, 'OS', os);
}

const mockNetwork = {
  type: 'WIFI',
  getIpAddressAsync: jest.fn(async () => '172.30.12.34'),
};
jest.mock('expo-network', () => ({
  NetworkStateType: { WIFI: 'WIFI', CELLULAR: 'CELLULAR' },
  getNetworkStateAsync: async () => ({ type: mockNetwork.type, isConnected: true }),
  getIpAddressAsync: () => mockNetwork.getIpAddressAsync(),
}));

// The ExpoNetwork native module as the running binary has it: null = not
// linked at all, {} = linked but built before the patch.
let mockNative: { getWifiIpAddressAsync?: () => Promise<string | null> } | null = null;
jest.mock('expo-modules-core', () => ({
  ...jest.requireActual('expo-modules-core'),
  requireOptionalNativeModule: (name: string) =>
    name === 'ExpoNetwork' ? mockNative : jest.requireActual('expo-modules-core').requireOptionalNativeModule(name),
}));

afterEach(() => {
  jest.restoreAllMocks();
});

beforeEach(() => {
  runningOn('ios');
  mockNetwork.type = 'WIFI';
  mockNetwork.getIpAddressAsync.mockClear();
  mockNative = null;
});

describe('currentWifiIp on iOS', () => {
  it('sends nothing on a binary built before the patch, and never calls the crashing getIpAddressAsync', async () => {
    mockNative = {};

    await expect(currentWifiIp()).resolves.toBe('');
    expect(mockNetwork.getIpAddressAsync).not.toHaveBeenCalled();
  });

  it('reads the Wi-Fi address from the patched module', async () => {
    mockNative = { getWifiIpAddressAsync: jest.fn(async () => '172.30.40.5') };

    await expect(currentWifiIp()).resolves.toBe('172.30.40.5');
    expect(mockNetwork.getIpAddressAsync).not.toHaveBeenCalled();
  });

  it('sends nothing when the patched module finds no Wi-Fi address', async () => {
    mockNative = { getWifiIpAddressAsync: jest.fn(async () => null) };

    await expect(currentWifiIp()).resolves.toBe('');
  });

  it('sends nothing off Wi-Fi without asking for an address at all', async () => {
    const getWifiIpAddressAsync = jest.fn(async () => '172.30.40.5');
    mockNative = { getWifiIpAddressAsync };
    mockNetwork.type = 'CELLULAR';

    await expect(currentWifiIp()).resolves.toBe('');
    expect(getWifiIpAddressAsync).not.toHaveBeenCalled();
  });
});

describe('currentWifiIp on Android', () => {
  it("uses expo-network's getIpAddressAsync, which is safe there", async () => {
    runningOn('android');

    await expect(currentWifiIp()).resolves.toBe('172.30.12.34');
    expect(mockNetwork.getIpAddressAsync).toHaveBeenCalledTimes(1);
  });
});

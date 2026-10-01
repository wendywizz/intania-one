import { Platform } from 'react-native';

/**
 * The phone's own IP address on Wi-Fi, or '' when it is not on Wi-Fi.
 *
 * Sent with a face stamp so the attendance record shows which network the
 * phone was on. It is the address the phone holds on the local network
 * (usually a private 10.x / 172.x / 192.168.x address), not the public address
 * the server sees — that one scooba already reads from the request itself.
 *
 * expo-network is required lazily, inside the try: its native module is looked
 * up at import, and a binary built before the package was added does not have
 * it. An OTA of this code onto such a binary then sends no Wi-Fi IP instead of
 * crashing on launch.
 *
 * iOS never calls expo-network's own getIpAddressAsync: it dereferences a nil
 * `ifa_addr` on interfaces that carry none (utun, awdl, ...), which is a native
 * crash no try/catch here can stop — the app closed the moment a scan was
 * checked. patches/expo-network+57.0.2.patch fixes it and adds
 * getWifiIpAddressAsync (en0 only); a binary built before the patch lacks that
 * function, so it is looked for rather than assumed, and such a binary simply
 * sends no Wi-Fi IP.
 */
export async function currentWifiIp(): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Network = require('expo-network') as typeof import('expo-network');

    const state = await Network.getNetworkStateAsync();
    if (state.type !== Network.NetworkStateType.WIFI) return '';

    const ip = Platform.OS === 'ios' ? await patchedIosWifiIp() : await Network.getIpAddressAsync();
    // 0.0.0.0 is what the native side answers when it has no address.
    return ip && ip !== '0.0.0.0' ? ip : '';
  } catch {
    return '';
  }
}

type PatchedExpoNetwork = { getWifiIpAddressAsync?: () => Promise<string | null> };

/** The patched module's Wi-Fi address, or '' on a binary without the patch. */
async function patchedIosWifiIp(): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { requireOptionalNativeModule } = require('expo-modules-core') as typeof import('expo-modules-core');
  const native = requireOptionalNativeModule<PatchedExpoNetwork>('ExpoNetwork');

  if (typeof native?.getWifiIpAddressAsync !== 'function') return '';

  return (await native.getWifiIpAddressAsync()) ?? '';
}

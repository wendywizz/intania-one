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
 */
export async function currentWifiIp(): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Network = require('expo-network') as typeof import('expo-network');

    const state = await Network.getNetworkStateAsync();
    if (state.type !== Network.NetworkStateType.WIFI) return '';

    const ip = await Network.getIpAddressAsync();
    // 0.0.0.0 is what the native side answers when it has no address.
    return ip && ip !== '0.0.0.0' ? ip : '';
  } catch {
    return '';
  }
}

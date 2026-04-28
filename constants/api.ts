// 10.0.2.2 is the Android emulator's alias for the host machine's localhost.
// Switch to your LAN IP (e.g. http://192.168.110.35) when testing on a physical device.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.110.108";

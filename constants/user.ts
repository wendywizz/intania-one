import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;

export const USER_ID: string =
  extra.EXPO_PUBLIC_DEFAULT_USER_ID ??
  process.env.EXPO_PUBLIC_DEFAULT_USER_ID ??
  '';

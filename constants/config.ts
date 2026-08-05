import Constants from 'expo-constants';

const OPENID_BASE_URL = 'https://psusso.psu.ac.th/application/o/coe-intania-sb';
const OPENID_DISCOVERY_URL = `${OPENID_BASE_URL}/.well-known/openid-configuration`;

const expoExtra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;

/**
 * Reads a public env var. Metro only inlines `process.env.EXPO_PUBLIC_X` when
 * it is written out literally, so a dynamic lookup like this one only ever
 * resolves through `extra` — every key read here must also be listed in
 * app.config.js so it gets copied there.
 */
function getEnvValue(name: string, fallback = '') {
  return expoExtra[name] ?? process.env[name] ?? fallback;
}

export const ENV = {
  expoOs: process.env.EXPO_OS ?? '',
  appMode: getEnvValue('EXPO_PUBLIC_MODE', 'development'),
  authNativeRedirectDomain: getEnvValue('EXPO_PUBLIC_AUTH_NATIVE_REDIRECT_DOMAIN', 'com.ecs.staffbuddy'),
  authRedirectDomain: getEnvValue('EXPO_PUBLIC_AUTH_REDIRECT_DOMAIN', ''),
  apiBaseUrl: getEnvValue('EXPO_PUBLIC_API_BASE_URL', ''),
  openIdAndroidBrowserPackage: getEnvValue('EXPO_PUBLIC_OPENID_ANDROID_BROWSER_PACKAGE', ''),
  openIdWebRedirectUrl: getEnvValue('EXPO_PUBLIC_OPENID_WEB_REDIRECT_URL', 'http://localhost:8081/oauth/callback'),
  openIdClientId: getEnvValue('EXPO_PUBLIC_OPENID_CLIENT_ID', ''),
  openIdClientSecret: getEnvValue('EXPO_PUBLIC_OPENID_CLIENT_SECRET', ''),
  openIdConfigurationUrl: getEnvValue('EXPO_PUBLIC_OPENID_CONFIGURATION_URL', OPENID_DISCOVERY_URL),
  openIdIssuer: getEnvValue('EXPO_PUBLIC_OPENID_ISSUER', OPENID_BASE_URL),
  openIdWebClientId: getEnvValue('EXPO_PUBLIC_OPENID_WEB_CLIENT_ID', ''),
  openIdWebClientSecret: getEnvValue('EXPO_PUBLIC_OPENID_WEB_CLIENT_SECRET', ''),
  openIdWebConfigurationUrl: getEnvValue('EXPO_PUBLIC_OPENID_WEB_CONFIGURATION_URL', 'https://psusso.psu.ac.th/application/o/coe-mobile-app/.well-known/openid-configuration'),
  openIdWebIssuer: getEnvValue('EXPO_PUBLIC_OPENID_WEB_ISSUER', 'https://psusso.psu.ac.th/application/o/coe-mobile-app'),
  scoobaApiKey: getEnvValue('EXPO_PUBLIC_SCOOBA_API_KEY', getEnvValue('EXPO_PUBLIC_SCOOBA_API_TOKEN', '')),
  scoobaApiToken: getEnvValue('EXPO_PUBLIC_SCOOBA_API_TOKEN', getEnvValue('EXPO_PUBLIC_SCOOBA_API_KEY', '')),
  googleApiKey: getEnvValue('EXPO_PUBLIC_GOOGLE_API_KEY', ''),
  deviceRegisterApiKey: getEnvValue('EXPO_PUBLIC_DEVICE_REGISTER_API_KEY', getEnvValue('EXPO_PUBLIC_SCOOBA_API_KEY', getEnvValue('EXPO_PUBLIC_SCOOBA_API_TOKEN', ''))),
};

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const root = path.resolve(__dirname);
const envFileName = process.env.ENVFILE || '.env';
const envPath = path.join(root, envFileName);

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const rawEnv = process.env;
const publicKeys = [
  'EXPO_PUBLIC_MODE',
  'EXPO_PUBLIC_AUTH_NATIVE_REDIRECT_DOMAIN',
  'EXPO_PUBLIC_AUTH_REDIRECT_DOMAIN',
  'EXPO_PUBLIC_OPENID_WEB_REDIRECT_URL',
  'EXPO_PUBLIC_OPENID_WEB_CLIENT_ID',
  'EXPO_PUBLIC_OPENID_WEB_CLIENT_SECRET',
  'EXPO_PUBLIC_OPENID_WEB_CONFIGURATION_URL',
  'EXPO_PUBLIC_OPENID_WEB_ISSUER',
  'EXPO_PUBLIC_SCOOBA_API_TOKEN',
  'EXPO_PUBLIC_SCOOBA_API_KEY',
  'EXPO_PUBLIC_GOOGLE_API_KEY',
  'EXPO_PUBLIC_DEVICE_REGISTER_API_KEY',
  'EXPO_PUBLIC_API_BASE_URL',
  'EXPO_PUBLIC_OPENID_ANDROID_BROWSER_PACKAGE',
  'EXPO_PUBLIC_OPENID_CLIENT_ID',
  'EXPO_PUBLIC_OPENID_CLIENT_SECRET',
  'EXPO_PUBLIC_OPENID_CONFIGURATION_URL',
  'EXPO_PUBLIC_OPENID_ISSUER',
];

const extra = publicKeys.reduce((acc, key) => {
  if (typeof rawEnv[key] === 'string') {
    acc[key] = rawEnv[key];
  }
  return acc;
}, {});

const pkg = require('./package.json');

// `config` is app.json's expo object, already filled in with Expo's defaults.
// Take it as the base rather than require()-ing app.json ourselves — that is how
// Expo detects the static config is actually in use (expo-doctor flags the
// require() form as an unused app.json).
module.exports = ({ config }) => {
  // EAS project link. `eas init` can't write this into a dynamic config, and the
  // computed `extra` above replaces app.json's `extra`, so the projectId must be
  // added here or the push-token code (getExpoPushTokenAsync) sees no projectId.
  //
  // Points at @faculty-of-engineer-psu/intania-one. The previous project
  // (@faculty-of-engineer/intania-staff-buddy) was deleted on 2026-09-01 — an
  // EAS project's slug is fixed at creation, so renaming the app meant a new
  // project rather than an edit.
  extra.eas = {
    ...(config.extra?.eas || {}),
    projectId: '31d71936-d7c8-435e-bc91-f7027444706a',
  };

  return {
    ...config,
    // package.json is the single source of truth for the app version: it drives
    // the store version and the number Settings shows via Constants.expoConfig.
    // Bump it there and both follow. (Build numbers stay with EAS — eas.json
    // sets appVersionSource: "remote".)
    version: pkg.version,
    owner: 'faculty-of-engineer-psu',
    extra,
  };
};

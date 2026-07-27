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

const appJson = require('./app.json');
const pkg = require('./package.json');

// EAS project link. `eas init` can't write this into a dynamic config, and the
// computed `extra` above replaces app.json's `extra`, so the projectId must be
// added here or the push-token code (getExpoPushTokenAsync) sees no projectId.
extra.eas = {
  ...(appJson.expo?.extra?.eas || {}),
  projectId: 'e80523a6-8198-45eb-945a-62a7bb15943f',
};

module.exports = {
  expo: {
    ...appJson.expo,
    // package.json is the single source of truth for the app version: it drives
    // the store version and the number Settings shows via Constants.expoConfig.
    // Bump it there and both follow. (Build numbers stay with EAS — eas.json
    // sets appVersionSource: "remote".)
    version: pkg.version,
    owner: 'faculty-of-engineer',
    extra,
  },
};

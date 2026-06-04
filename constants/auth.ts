const AUTH_MODE = process.env.EXPO_PUBLIC_MODE ?? 'development';
const OPENID_BASE_URL = 'https://psusso.psu.ac.th';
const AUTH_API_BASE_URL =
  AUTH_MODE === 'production' ? 'https://saas.eng.psu.ac.th' : 'http://localhost:1337';
const AUTH_DOMAIN =
  AUTH_MODE === 'production' ? 'com.ecs.intaniaSB.psu.ac.th' : 'http://localhost:8081';
const AUTH_REDIRECT_PATH = '/oauth/callback';
const OPENID_ENV_PREFIX =
  AUTH_MODE === 'production' ? 'EXPO_PUBLIC_OPENID_PRODUCTION' : 'EXPO_PUBLIC_OPENID_DEVELOPMENT';

function readEnv(name: string) {
  return process.env[name] ?? '';
}

const OPENID_CONFIG = {
  clientId: readEnv(`${OPENID_ENV_PREFIX}_CLIENT_ID`) || readEnv('EXPO_PUBLIC_OPENID_CLIENT_ID'),
  clientSecret:
    readEnv(`${OPENID_ENV_PREFIX}_CLIENT_SECRET`) || readEnv('EXPO_PUBLIC_OPENID_CLIENT_SECRET'),
  discoveryUrl:
    readEnv(`${OPENID_ENV_PREFIX}_CONFIGURATION_URL`) ||
    readEnv('EXPO_PUBLIC_OPENID_CONFIGURATION_URL'),
  issuer: readEnv(`${OPENID_ENV_PREFIX}_ISSUER`) || readEnv('EXPO_PUBLIC_OPENID_ISSUER'),
};

function createAuthRedirectUrl() {
  if (AUTH_DOMAIN.startsWith('http')) {
    return `${AUTH_DOMAIN}${AUTH_REDIRECT_PATH}`;
  }

  return `${AUTH_DOMAIN}://${AUTH_REDIRECT_PATH.replace(/^\//, '')}`;
}

export const AUTH = {
  clientId: OPENID_CONFIG.clientId,
  clientSecret: OPENID_CONFIG.clientSecret,
  discoveryUrl: OPENID_CONFIG.discoveryUrl,
  issuer: OPENID_CONFIG.issuer,
  authDomain: AUTH_DOMAIN,
  nativeRedirectUrl: createAuthRedirectUrl(),
  webRedirectUrl: createAuthRedirectUrl(),
  webRedirectPath: AUTH_REDIRECT_PATH,
  webProxy: {
    discovery: `${AUTH_API_BASE_URL}/api/openid/discovery`,
    token: `${AUTH_API_BASE_URL}/api/openid/token`,
    userInfo: `${AUTH_API_BASE_URL}/api/openid/userinfo`,
  },
  scopes: ['openid', 'profile', 'email', 'psu_profile'],
  endpoints: {
    authorize: `${OPENID_BASE_URL}/application/o/authorize/`,
    token: `${OPENID_BASE_URL}/application/o/token/`,
    userInfo: `${OPENID_BASE_URL}/application/o/userinfo/`,
  },
  storageKeys: {
    user: 'AUTH_USER',
    accessToken: 'ACCESS_TOKEN',
    refreshToken: 'REFRESH_TOKEN',
    loggedIn: 'LOGGED_IN',
    oauthState: 'OAUTH_STATE',
  },
};

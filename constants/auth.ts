import {
  AUTH_MODE,
  AUTH_REDIRECT_DOMAIN,
  AUTH_REDIRECT_PATH,
  OPENID_AUTHORIZE_URL,
  OPENID_DISCOVERY_URL,
  OPENID_TOKEN_URL,
  OPENID_USERINFO_URL,
} from './endpoints';

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
    readEnv('EXPO_PUBLIC_OPENID_CONFIGURATION_URL') ||
    OPENID_DISCOVERY_URL,
  issuer: readEnv(`${OPENID_ENV_PREFIX}_ISSUER`) || readEnv('EXPO_PUBLIC_OPENID_ISSUER'),
};

function createAuthRedirectUrl() {
  if (AUTH_REDIRECT_DOMAIN.startsWith('http')) {
    return `${AUTH_REDIRECT_DOMAIN}${AUTH_REDIRECT_PATH}`;
  }

  return `${AUTH_REDIRECT_DOMAIN}://${AUTH_REDIRECT_PATH.replace(/^\//, '')}`;
}

export const AUTH = {
  clientId: OPENID_CONFIG.clientId,
  clientSecret: OPENID_CONFIG.clientSecret,
  discoveryUrl: OPENID_CONFIG.discoveryUrl,
  issuer: OPENID_CONFIG.issuer,
  authDomain: AUTH_REDIRECT_DOMAIN,
  nativeRedirectUrl: createAuthRedirectUrl(),
  webRedirectUrl: createAuthRedirectUrl(),
  webRedirectPath: AUTH_REDIRECT_PATH,
  scopes: ['openid', 'profile', 'email', 'psu_profile'],
  endpoints: {
    authorize: OPENID_AUTHORIZE_URL,
    token: OPENID_TOKEN_URL,
    userInfo: OPENID_USERINFO_URL,
  },
  storageKeys: {
    user: 'AUTH_USER',
    accessToken: 'ACCESS_TOKEN',
    refreshToken: 'REFRESH_TOKEN',
    loggedIn: 'LOGGED_IN',
    oauthState: 'OAUTH_STATE',
  },
};

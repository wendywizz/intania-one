import { Platform } from 'react-native';
import { ENV } from './config';
import {
  AUTH_REDIRECT_DOMAIN,
  AUTH_REDIRECT_PATH,
  OPENID_AUTHORIZE_URL,
  OPENID_DISCOVERY_URL,
  OPENID_TOKEN_URL,
  OPENID_USERINFO_URL,
} from './endpoints';

const isWeb = Platform.OS === 'web';

function createAuthRedirectUrl() {
  if (AUTH_REDIRECT_DOMAIN.startsWith('http')) {
    return `${AUTH_REDIRECT_DOMAIN}${AUTH_REDIRECT_PATH}`;
  }

  return `${AUTH_REDIRECT_DOMAIN}://${AUTH_REDIRECT_PATH.replace(/^\//, '')}`;
}

const OPENID_CONFIG = {
  clientId: isWeb ? ENV.openIdWebClientId || ENV.openIdClientId : ENV.openIdClientId,
  clientSecret: isWeb ? ENV.openIdWebClientSecret || ENV.openIdClientSecret : ENV.openIdClientSecret,
  discoveryUrl: isWeb ? ENV.openIdWebConfigurationUrl || ENV.openIdConfigurationUrl : ENV.openIdConfigurationUrl,
  issuer: isWeb ? ENV.openIdWebIssuer || ENV.openIdIssuer : ENV.openIdIssuer,
  webRedirectUrl: ENV.openIdWebRedirectUrl,
};

export const AUTH = {
  clientId: OPENID_CONFIG.clientId,
  clientSecret: OPENID_CONFIG.clientSecret,
  discoveryUrl: OPENID_CONFIG.discoveryUrl || OPENID_DISCOVERY_URL,
  issuer: OPENID_CONFIG.issuer,
  authDomain: AUTH_REDIRECT_DOMAIN,
  nativeRedirectUrl: createAuthRedirectUrl(),
  webRedirectUrl: OPENID_CONFIG.webRedirectUrl || createAuthRedirectUrl(),
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

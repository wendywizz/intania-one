export const AUTH = {
  domain: 'oauth2.eng.psu.ac.th',
  clientId: 'c1ed10d3d69a30e4332fe1584522b1a7381106df',
  clientSecret: 'AMgU9DrbCqWqhZvgV8zXlDomDyzzSSRhtX1rqhrRwd8C2rHMn6',
  issuer: 'https://oauth2.eng.psu.ac.th',
  nativeRedirectUrl: 'com.ecs.staffbuddy://login-callback',
  webRedirectUrl: 'http://localhost:8081/login-callback',
  webRedirectPath: '/login-callback',
  scopes: ['userinfo'],
  endpoints: {
    authorize: '/authorize',
    token: '/authorize/token',
    userInfo: '/resource/userinfo',
  },
  storageKeys: {
    user: 'AUTH_USER',
    accessToken: 'ACCESS_TOKEN',
    refreshToken: 'REFRESH_TOKEN',
    loggedIn: 'LOGGED_IN',
    oauthState: 'OAUTH_STATE',
  },
};

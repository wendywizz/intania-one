export const AUTH = {
  domain: 'oauth2.eng.psu.ac.th',
  clientId: 'c1ed10d3d69a30e4332fe1584522b1a7381106df',
  clientSecret: 'AMgU9DrbCqWqhZvgV8zXlDomDyzzSSRhtX1rqhrRwd8C2rHMn6',
  redirectUrl: 'com.ecs.staffbuddy://login-callback',
  issuer: 'https://oauth2.eng.psu.ac.th',
  scopes: ['userinfo'],
  storageKeys: {
    user: 'AUTH_USER',
    refreshToken: 'REFRESH_TOKEN',
    loggedIn: 'LOGGED_IN',
  },
};

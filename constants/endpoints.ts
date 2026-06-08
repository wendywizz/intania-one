export const APP_MODE = process.env.EXPO_PUBLIC_MODE ?? 'development';
const EXPO_OS = process.env.EXPO_OS ?? '';
export const API_MODE = process.env.EXPO_PUBLIC_API_MODE ?? APP_MODE;
export const AUTH_MODE = process.env.EXPO_PUBLIC_AUTH_MODE ?? APP_MODE;

export const API_DOMAINS = {
  development: 'http://localhost:1337',
  production: 'https://saas.eng.psu.ac.th',
};

export const AUTH_REDIRECT_DOMAINS = {
  development: 'http://localhost:8081',
  native: process.env.EXPO_PUBLIC_AUTH_NATIVE_REDIRECT_DOMAIN || 'com.ecs.staffbuddy',
};

export const OPENID_BASE_URL = 'https://psusso.psu.ac.th';
export const STAFF_NEWS_FEED_URL =
  'https://www.eng.psu.ac.th/index.php?option=com_content&view=category&id=15&format=feed&type=rss';
export const LOCAL_URL_BASE = 'http://localhost';

export const DEVELOPMENT_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  (EXPO_OS === 'android' ? 'http://10.0.2.2:1337' : API_DOMAINS.development);
export const API_BASE_URL = API_MODE === 'production' ? API_DOMAINS.production : DEVELOPMENT_API_BASE_URL;
export const AUTH_REDIRECT_DOMAIN =
  process.env.EXPO_PUBLIC_AUTH_REDIRECT_DOMAIN ||
  (EXPO_OS === 'web' ? AUTH_REDIRECT_DOMAINS.development : AUTH_REDIRECT_DOMAINS.native);
export const AUTH_REDIRECT_PATH = EXPO_OS === 'web' ? '/oauth/callback' : 'oauth/callback';
export const PHOTO_BASE_URL = `${API_BASE_URL}/api/person/photo/`;
export const OPENID_DISCOVERY_URL = `${OPENID_BASE_URL}/application/o/coe-mobile-app/.well-known/openid-configuration`;
export const OPENID_AUTHORIZE_URL = `${OPENID_BASE_URL}/application/o/authorize/`;
export const OPENID_TOKEN_URL = `${OPENID_BASE_URL}/application/o/token/`;
export const OPENID_USERINFO_URL = `${OPENID_BASE_URL}/application/o/userinfo/`;

export const ENDPOINTS = {
  scooba: API_BASE_URL,
  scooba_dev: API_BASE_URL,
  staffNewsFeed: `${API_BASE_URL}/api/news`,
  forgotTimestamp: `${API_BASE_URL}/api/forget-timestamp`,
  absent: `${API_BASE_URL}/api/absent`,
  repairComputer: `${API_BASE_URL}/api/repair-computer`,  
  person: `${API_BASE_URL}/api/person`,
  meeting: `${API_BASE_URL}/api/meeting`,
  photoBase: PHOTO_BASE_URL,
  execCalendar: '/api/exec-calendars',
  pushRegisterDevice: `${API_BASE_URL}/api/push/register-device`,
};

export const METRO_PROXY_ENDPOINTS = {
  routes: {
    staffNewsFeed: '/api/staff-news-feed',
    absentInit: '/api/absent/init',
    absentHistory: '/api/absent/history',
    meetingList: '/api/meeting/list',
    repairComputerPrivilege: '/api/repair-computer/privilege',
    openIdToken: '/api/openid/token',
    openIdUserInfo: '/api/openid/userinfo',
  },
  absent: {
    leave: '/personnel/apis/absent/leave/',
    business: '/personnel/apis/absent/business/',
    birth: '/personnel/apis/absent/birth/',
    relax: '/personnel/apis/absent/relax/',
    hajj: '/personnel/apis/absent/hajj/',
    history: '/personnel/apis/absent/history',
  },
  meeting: {
    list: '/meetingv2/api/index.php/meeting/list',
  },
  repairComputer: {
    privilege: '/repairComputer/api/privilege',
  },
};

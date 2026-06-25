import { ENV } from './config';

const EXPO_OS = process.env.EXPO_OS ?? '';

export const API_DOMAINS = {
  development: 'http://localhost:1337',
  production: 'https://saas.eng.psu.ac.th',
};

export const AUTH_REDIRECT_DOMAINS = {
  development: 'http://localhost:8081',
  native: ENV.authNativeRedirectDomain,
};

export const OPENID_BASE_URL = 'https://psusso.psu.ac.th';
export const STAFF_NEWS_FEED_URL =
  'https://www.eng.psu.ac.th/index.php?option=com_content&view=category&id=15&format=feed&type=rss';
export const LOCAL_URL_BASE = 'http://localhost';

const APP_MODE = ENV.appMode;

export const DEVELOPMENT_API_BASE_URL =
  ENV.apiBaseUrl ||
  (EXPO_OS === 'android' ? 'http://10.0.2.2:1337' : API_DOMAINS.development);
export const API_BASE_URL =
  ENV.apiBaseUrl ||
  (APP_MODE === 'production' ? API_DOMAINS.production : DEVELOPMENT_API_BASE_URL);
export const AUTH_REDIRECT_DOMAIN =
  ENV.authRedirectDomain ||
  (EXPO_OS === 'web' ? AUTH_REDIRECT_DOMAINS.development : AUTH_REDIRECT_DOMAINS.native);
export const AUTH_REDIRECT_PATH = EXPO_OS === 'web' ? '/oauth/callback' : 'oauth/callback';
export const PHOTO_BASE_URL = 'https://apis.eng.psu.ac.th/personnel/v1/photo/';
export const OPENID_DISCOVERY_URL = `${OPENID_BASE_URL}/application/o/coe-mobile-app/.well-known/openid-configuration`;
export const OPENID_AUTHORIZE_URL = `${OPENID_BASE_URL}/application/o/authorize/`;
export const OPENID_TOKEN_URL = `${OPENID_BASE_URL}/application/o/token/`;
export const OPENID_USERINFO_URL = `${OPENID_BASE_URL}/application/o/userinfo/`;

export const ENDPOINTS = {
  scooba: API_BASE_URL,
  scooba_dev: API_BASE_URL,
  staffNewsFeed: `${API_BASE_URL}/api/news`,
  forgotTimestamp: `${API_BASE_URL}/api/forget-timestamp`,
  absence: `${API_BASE_URL}/api/absence`,
  repairComputer: `${API_BASE_URL}/api/repair-computer`,  
  person: `${API_BASE_URL}/api/person`,
  personUpdateInfo: `${API_BASE_URL}/api/person/update-info`,
  personUploadPhoto: `${API_BASE_URL}/api/person/upload-photo`,
  meeting: `${API_BASE_URL}/api/meeting`,
  meetingTopics: `${API_BASE_URL}/api/meeting/topics`,
  meetingPdf: `${API_BASE_URL}/api/meeting/pdf`,
  photoBase: PHOTO_BASE_URL,
  execCalendar: '/api/exec-calendars',
  pushRegisterDevice: `${API_BASE_URL}/api/push/register-device`,
  examinar: `${API_BASE_URL}/api/examinar`,
  examinarDetail: `${API_BASE_URL}/api/examinar/detail`,
};

export const METRO_PROXY_ENDPOINTS = {
  routes: {
    staffNewsFeed: '/api/staff-news-feed',
    absenceInit: '/api/absence/init',
    absenceHistory: '/api/absence/history',
    meetingList: '/api/meeting/list',
    repairComputerPrivilege: '/api/repair-computer/privilege',
    openIdToken: '/api/openid/token',
    openIdUserInfo: '/api/openid/userinfo',
  },
  absence: {
    leave: '/personnel/apis/absence/leave/',
    business: '/personnel/apis/absence/business/',
    birth: '/personnel/apis/absence/birth/',
    relax: '/personnel/apis/absence/relax/',
    hajj: '/personnel/apis/absence/hajj/',
    history: '/personnel/apis/absence/history',
  },
  meeting: {
    list: '/meetingv2/api/index.php/meeting/list',
  },
  repairComputer: {
    privilege: '/repairComputer/api/privilege',
  },
};

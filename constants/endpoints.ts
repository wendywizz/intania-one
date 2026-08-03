import { ENV } from './config';

const EXPO_OS = process.env.EXPO_OS ?? '';

export const API_DOMAINS = {
  //development: 'http://localhost:1337',
  development: 'http://172.31.133.131:1337',
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
  health: `${API_BASE_URL}/api/health`,
  staffNewsFeed: `${API_BASE_URL}/api/news`,
  timestamp: `${API_BASE_URL}/api/timestamp`,
  absence: `${API_BASE_URL}/api/absence`,
  repairComputer: `${API_BASE_URL}/api/repair-computer`,  
  person: `${API_BASE_URL}/api/person`,
  staffInfo: `${API_BASE_URL}/api/staff-info`,
  personUpdateInfo: `${API_BASE_URL}/api/person/update-info`,
  personUploadPhoto: `${API_BASE_URL}/api/person/upload-photo`,
  meeting: `${API_BASE_URL}/api/meeting`,
  bookingRoomRooms: `${API_BASE_URL}/api/booking-room/rooms`,
  bookingRoomSchedule: `${API_BASE_URL}/api/booking-room/schedule`,
  bookingRoomMyBookings: `${API_BASE_URL}/api/booking-room/my-bookings`,
  bookingRoomMyBookingDetail: `${API_BASE_URL}/api/booking-room/my-bookings/detail`,
  bookingRoomMyBookingDelete: `${API_BASE_URL}/api/booking-room/my-bookings/delete`,
  bookingRoomMyBookingSlotDelete: `${API_BASE_URL}/api/booking-room/my-bookings/delete-slot`,
  bookingRoomBookOptions: `${API_BASE_URL}/api/booking-room/book/options`,
  bookingRoomBookCheckDate: `${API_BASE_URL}/api/booking-room/book/check-date`,
  bookingRoomBookRooms: `${API_BASE_URL}/api/booking-room/book/rooms`,
  bookingRoomBookCreate: `${API_BASE_URL}/api/booking-room/book/create`,
  bookingRoomTermOptions: `${API_BASE_URL}/api/booking-room/book/term-options`,
  bookingRoomTermRooms: `${API_BASE_URL}/api/booking-room/book/term-rooms`,
  bookingRoomTermCreate: `${API_BASE_URL}/api/booking-room/book/term-create`,
  bookingRoomPeriodOptions: `${API_BASE_URL}/api/booking-room/book/period-options`,
  bookingRoomPeriodDays: `${API_BASE_URL}/api/booking-room/book/period-days`,
  bookingRoomPeriodRooms: `${API_BASE_URL}/api/booking-room/book/period-rooms`,
  bookingRoomPeriodCreate: `${API_BASE_URL}/api/booking-room/book/period-create`,
  meetingTopics: `${API_BASE_URL}/api/meeting/topics`,
  meetingPdf: `${API_BASE_URL}/api/meeting/pdf`,
  noticeRepair: `${API_BASE_URL}/api/notice-repair`,
  noticeRepairRoleCheck: `${API_BASE_URL}/api/role/check`,
  noticeRepairApproveNew: `${API_BASE_URL}/api/repair/approve_new`,
  noticeRepairAdminPending: `${API_BASE_URL}/api/repair/admin_pending`,
  noticeRepairAdminList: `${API_BASE_URL}/api/repair/admin_list`,
  noticeRepairAdminFinished: `${API_BASE_URL}/api/repair/admin_finished`,
  noticeRepairSupplyMaterial: `${API_BASE_URL}/api/repair/supply_material`,
  noticeRepairDeptSupply: `${API_BASE_URL}/api/repair/dept_supply_response`,
    noticeRepairRefWorkCategories: `${API_BASE_URL}/api/notice-repair/work_categories`,
  noticeRepairRefBuildings: `${API_BASE_URL}/api/notice-repair/buildings`,
  noticeRepairAdminAccept: `${API_BASE_URL}/api/repair/accept`,
  noticeRepairAdminReject: `${API_BASE_URL}/api/repair/reject`,
  noticeRepairAdminUpdate: `${API_BASE_URL}/api/repair/update`,
  noticeRepairCanRepair: `${API_BASE_URL}/api/repair/can_repair`,
  noticeRepairNotRepair: `${API_BASE_URL}/api/repair/not_repair`,
  noticeRepairInformerCurrent: `${API_BASE_URL}/api/repair/informer_current`,
  noticeRepairInformerFinished: `${API_BASE_URL}/api/repair/informer_finished`,
  noticeRepairHeaderPending: `${API_BASE_URL}/api/repair/header_pending`,
  noticeRepairHeaderEstimate: `${API_BASE_URL}/api/repair/header_estimate`,
  noticeRepairHeaderProgress: `${API_BASE_URL}/api/repair/header_progress`,
  noticeRepairHeaderNote: `${API_BASE_URL}/api/repair/header_note`,
  noticeRepairExaminePending: `${API_BASE_URL}/api/repair/examine_pending`,
  noticeRepairNotRepairAck: `${API_BASE_URL}/api/repair/not_repair_ack`,
  noticeRepairHeaderRepairing: `${API_BASE_URL}/api/repair/header_repairing`,
  noticeRepairHeaderFinished: `${API_BASE_URL}/api/repair/header_finished`,
  noticeRepairDetail: `${API_BASE_URL}/api/repair/detail`,
  noticeRepairHeaderDetail: `${API_BASE_URL}/api/repair/header_detail`,
  noticeRepairFullDetail: `${API_BASE_URL}/api/repair/full_detail`,
  noticeRepairApprove: `${API_BASE_URL}/api/repair/approve`,
  noticeRepairCancel: `${API_BASE_URL}/api/repair/cancel`,
  noticeRepairNotAgree: `${API_BASE_URL}/api/repair/not_agree`,
  noticeRepairRequisition: `${API_BASE_URL}/api/repair/requisition`,
  noticeRepairRequisitionRequesters: `${API_BASE_URL}/api/repair/requisition_requesters`,
  noticeRepairRequisitionSave: `${API_BASE_URL}/api/repair/requisition_save`,
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

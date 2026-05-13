// ignore_for_file: constant_identifier_names

const String OS_ANDROID = 'android';
const String OS_IOS = 'ios';

const String IS_INITED = 'IS_INITED';
const String DEVICE_ID = 'DEVICE_ID';

const String RESPONSE_TYPE_SUCCESS = 'success';
const String RESPONSE_TYPE_ERROR = 'error';
const String RESPONSE_TYPE_WARNING = 'warning';
const String RESPONSE_TYPE_DEFAULT = 'default';
const String RESPONSE_TYPE_INFO = 'info';

const int DEFAULT_DISPLAY_LENGTH = 10;
const int NEWS_DISPLAY_LENGTH = 3;

const Duration CONNECTION_TIMEOUT = Duration(milliseconds: 2000);
const Duration DELAY_TIMEOUT = Duration(milliseconds: 2000);

const String PROCESS_SUCCESS = 'successed';
const String PROCESS_FAILED = 'failed';
const String PROCESS_NO_DATA = 'no-data';
const String PROCESS_NO_PERSON = 'no-person';
const String PROCESS_ERROR = 'error';

const double BOTTOM_BAR_ICON_SIZE = 32;

/* Homepage */
const double homeIconHeight = 48;

const String textIconAbsent = 'การลา';
const String textIconMissTimestamp = 'ลืมลงเวลา';
const String textIconRepairComputer = 'แจ้งซ่อมคอมฯ';
const String textIconCalendarExecutive = 'ปฎิทินผู้บริหาร';
const String textIconMeeting = 'การประชุม';
const String textIconPersonSearch = 'ค้นหาบุคลากร';

const String iconAbsent = 'assets/img/icon/icon-absent.png';
const String iconMissTimestamp = 'assets/img/icon/icon-miss_timestamp.png';
const String iconRepairComputer = 'assets/img/icon/icon-rc.png';
const String iconCalendarExecutive = 'assets/img/icon/icon-calendar-exec.png';
const String iconMeeting = 'assets/img/icon/icon-meeting.png';
const String iconPersonSearch = 'assets/img/icon/icon-search.png';

/* Absent */
const int TABINDEX_ABSENT_USER_WAITING = 1;

const String PROCESS_REMAIN = 'remain';
const String PROCESS_INVALID_SEX = 'invalid_sex';
const String PROCESS_NO_APPROVER = 'approver';
const String PROCESS_NO_DEPT_ADMIN = 'style';

const String TYPE_ABSENT_CANCEL = '0';
const String TYPE_ABSENT_LEAVE = '1';
const String TYPE_ABSENT_BUSINESS = '2';
const String TYPE_ABSENT_BIRTH = '3';
const String TYPE_ABSENT_RELAX = '4';
const String TYPE_ABSENT_ORDAIN = '5';
const String TYPE_ABSENT_HAJJ = '6';
const String TYPE_ABSENT_SOLDIER = '7';
const String TYPE_ABSENT_HELPMATE = '9';
const String TYPE_ABSENT_REHAB = '10';

const String TYPE_ABSENT_APPROVE_ABSENT = 'absence';
const String TYPE_ABSENT_APPROVE_MISS_TIMESTAMP = 'miss_timestamp';
const String TYPE_ABSENT_MISS_TIMESTAMP_INTIME = 'miss_timestamp_intime';
const String TYPE_ABSENT_MISS_TIMESTAMP_OUTTIME = 'miss_timestamp_outtime';

const String TYPE_ABSENT_APPROVE_ACCEPT = '1';
const String TYPE_ABSENT_APPROVE_DENIED = '2';

const HALF_DAY_NULL = {'label': '-', 'value': '0'};
const HALF_DAY_FIRST_MORNING = {'label': 'วันแรกครึ่งเช้า', 'value': '1'};
const HALF_DAY_FIRST_NOON = {'label': 'วันแรกครึ่งบ่าย', 'value': '2'};
const HALF_DAY_LAST_MORNING = {'label': 'วันสุดท้ายครึ่งเช้า', 'value': '3'};
const HALF_DAY_LAST_NOON = {'label': 'วันสุดท้ายครึ่งบ่าย', 'value': '4'};

const HALF_DAYPART_LIST = [
  HALF_DAY_NULL,
  HALF_DAY_FIRST_MORNING,
  HALF_DAY_FIRST_NOON,
  HALF_DAY_LAST_MORNING,
  HALF_DAY_LAST_NOON,
];

/* Meeting */
const String TYPE_CONTENT_MEETING_TODAY = 't';
const String TYPE_CONTENT_MEETING_INCOMING = 'c';
const String TYPE_CONTENT_MEETING_HISTORY = 'p';

/* Repair Computer */
const String TYPE_CONTENT_FINISH = 'f';
const String TYPE_CONTENT_CANCEL = 'c';

const String STATUS_RC_NEW_JOB = '0';
const String STATUS_RC_WAIT_WORKER = '2';
const String STATUS_RC_WORKER_REJECT = '2.1';
const String STATUS_RC_WORKER_ACCEPT = '3';
const String STATUS_RC_WORKING = '4';
const String STATUS_RC_WAIT_CLOSEJOB = '4.1';
const String STATUS_RC_WAIT_FOREMAN = '4.2';
const String STATUS_RC_FOREWARD = '4.3';
const String STATUS_RC_FINISH = '5';
const String STATUS_RC_REJECT = '6';
const String STATUS_RC_SUPPLY_APPROVE = '7';
const String STATUS_RC_SUPPLYING = '7.1';
const String STATUS_RC_REJECT_SUPPLY = '7.2';

const int TABINDEX_RC_USER_CURRENT = 0;
const int TABINDEX_RC_USER_QUEUE = 1;
const int TABINDEX_RC_USER_HISTORY = 2;

const int TABINDEX_RC_WORKER_RECEIVE_JOB = 0;
const int TABINDEX_RC_WORKER_CURRENT_JOB = 1;
const int TABINDEX_RC_WORKER_HISTORY = 2;

const int TABINDEX_RC_FOREMAN_NEW_JOB = 0;
const int TABINDEX_RC_FOREMAN_MANAGE_JOB = 1;
const int TABINDEX_RC_FOREMAN_SUPPLY = 2;
const int TABINDEX_RC_FOREMAN_HISTORY = 3;

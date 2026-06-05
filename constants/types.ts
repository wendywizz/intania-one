export const TYPE_ABSENT_CANCEL = '0';
export const TYPE_ABSENT_SICK = '1';
export const TYPE_ABSENT_BUSINESS = '2';
export const TYPE_ABSENT_BIRTH = '3';
export const TYPE_ABSENT_RELAX = '4';
export const TYPE_ABSENT_ORDAIN = '5';
export const TYPE_ABSENT_HAJJ = '6';
export const TYPE_ABSENT_SOLDIER = '7';
export const TYPE_ABSENT_HELPMATE = '9';
export const TYPE_ABSENT_REHAB = '10';

export const ABSENT_TYPES = {
  cancel: TYPE_ABSENT_CANCEL,
  leave: TYPE_ABSENT_SICK,
  business: TYPE_ABSENT_BUSINESS,
  birth: TYPE_ABSENT_BIRTH,
  relax: TYPE_ABSENT_RELAX,
  ordain: TYPE_ABSENT_ORDAIN,
  hajj: TYPE_ABSENT_HAJJ,
  soldier: TYPE_ABSENT_SOLDIER,
  helpmate: TYPE_ABSENT_HELPMATE,
  rehab: TYPE_ABSENT_REHAB,
} as const;

export const TYPE_MEETING_TODAY = 't';
export const TYPE_MEETING_INCOMING = 'c';
export const TYPE_MEETING_HISTORY = 'p';

export const MEETING_TYPE = {
  TODAY: TYPE_MEETING_TODAY,
  INCOMING: TYPE_MEETING_INCOMING,
  SHARED_HISTORY: TYPE_MEETING_HISTORY,
};

export const RP_APP_ID = 'repairComputer';

export const PRIVILEGE_RC_USER = 'user';
export const PRIVILEGE_RC_FOREMAN = 'foreman';
export const PRIVILEGE_RC_WORKER = 'worker';

export const REPAIR_COMPUTER_DEFAULT_ROLE = PRIVILEGE_RC_USER;

export const REPAIR_COMPUTER_PRIVILEGES = {
  user: PRIVILEGE_RC_USER,
  foreman: PRIVILEGE_RC_FOREMAN,
  worker: PRIVILEGE_RC_WORKER,
} as const;

export type RepairComputerRole =
  (typeof REPAIR_COMPUTER_PRIVILEGES)[keyof typeof REPAIR_COMPUTER_PRIVILEGES];

export const REPAIR_STATUS_NEW_JOB = '0';
export const REPAIR_STATUS_WAIT_WORKER = '2';
export const REPAIR_STATUS_WORKER_REJECT = '2.1';
export const REPAIR_STATUS_WORKER_ACCEPT = '3';
export const REPAIR_STATUS_WORKING = '4';
export const REPAIR_STATUS_WAIT_CLOSE_JOB = '4.1';
export const REPAIR_STATUS_WAIT_FOREMAN = '4.2';
export const REPAIR_STATUS_FINISH = '5';
export const REPAIR_STATUS_REJECT = '6';

export const REPAIR_COMPUTER_STATUS = {
  newJob: REPAIR_STATUS_NEW_JOB,
  waitWorker: REPAIR_STATUS_WAIT_WORKER,
  workerReject: REPAIR_STATUS_WORKER_REJECT,
  workerAccept: REPAIR_STATUS_WORKER_ACCEPT,
  working: REPAIR_STATUS_WORKING,
  waitCloseJob: REPAIR_STATUS_WAIT_CLOSE_JOB,
  waitForeman: REPAIR_STATUS_WAIT_FOREMAN,
  finish: REPAIR_STATUS_FINISH,
  reject: REPAIR_STATUS_REJECT,
} as const;

export const TYPE_absence_CANCEL = '0';
export const TYPE_absence_SICK = '1';
export const TYPE_absence_BUSINESS = '2';
export const TYPE_absence_BIRTH = '3';
export const TYPE_absence_RELAX = '4';
export const TYPE_absence_ORDAIN = '5';
export const TYPE_absence_HAJJ = '6';
export const TYPE_absence_SOLDIER = '7';
export const TYPE_absence_HELPMATE = '9';
export const TYPE_absence_REHAB = '10';

export const absence_TYPES = {
  cancel: TYPE_absence_CANCEL,
  leave: TYPE_absence_SICK,
  business: TYPE_absence_BUSINESS,
  birth: TYPE_absence_BIRTH,
  relax: TYPE_absence_RELAX,
  ordain: TYPE_absence_ORDAIN,
  hajj: TYPE_absence_HAJJ,
  soldier: TYPE_absence_SOLDIER,
  helpmate: TYPE_absence_HELPMATE,
  rehab: TYPE_absence_REHAB,
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
export const REPAIR_STATUS_FORWARD_FOREMAN = '4.3';
export const REPAIR_STATUS_FINISH = '5';
export const REPAIR_STATUS_REJECT = '6';
export const REPAIR_STATUS_WAIT_APPROVAL = '7';
export const REPAIR_STATUS_PROCESSING_EQUIPMENT = '7.1';
export const REPAIR_STATUS_APPROVAL_REJECTED = '7.2';

export const REPAIR_COMPUTER_STATUS = {
  newJob: REPAIR_STATUS_NEW_JOB,
  waitWorker: REPAIR_STATUS_WAIT_WORKER,
  workerReject: REPAIR_STATUS_WORKER_REJECT,
  workerAccept: REPAIR_STATUS_WORKER_ACCEPT,
  working: REPAIR_STATUS_WORKING,
  waitCloseJob: REPAIR_STATUS_WAIT_CLOSE_JOB,
  waitForeman: REPAIR_STATUS_WAIT_FOREMAN,
  forwardForeman: REPAIR_STATUS_FORWARD_FOREMAN,
  finish: REPAIR_STATUS_FINISH,
  reject: REPAIR_STATUS_REJECT,
  waitApproval: REPAIR_STATUS_WAIT_APPROVAL,
  processingEquipment: REPAIR_STATUS_PROCESSING_EQUIPMENT,
  approvalRejected: REPAIR_STATUS_APPROVAL_REJECTED,
} as const;

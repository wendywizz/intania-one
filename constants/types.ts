export const TYPE_ABSENCE_CANCEL = '0';
export const TYPE_ABSENCE_SICK = '1';
export const TYPE_ABSENCE_BUSINESS = '2';
export const TYPE_ABSENCE_BIRTH = '3';
export const TYPE_ABSENCE_RELAX = '4';
export const TYPE_ABSENCE_ORDAIN = '5';
export const TYPE_ABSENCE_HAJJ = '6';
export const TYPE_ABSENCE_SOLDIER = '7';
export const TYPE_ABSENCE_HELPMATE = '9';
export const TYPE_ABSENCE_REHAB = '10';

export const ABSENCE_TYPES = {
  cancel: TYPE_ABSENCE_CANCEL,
  leave: TYPE_ABSENCE_SICK,
  business: TYPE_ABSENCE_BUSINESS,
  birth: TYPE_ABSENCE_BIRTH,
  relax: TYPE_ABSENCE_RELAX,
  ordain: TYPE_ABSENCE_ORDAIN,
  hajj: TYPE_ABSENCE_HAJJ,
  soldier: TYPE_ABSENCE_SOLDIER,
  helpmate: TYPE_ABSENCE_HELPMATE,
  rehab: TYPE_ABSENCE_REHAB,
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

// Public Repair roles (maps to PHP API role strings)
export const NOTICE_REPAIR_ROLE_INFORMER = 'informer' as const;
export const NOTICE_REPAIR_ROLE_APPROVE = 'approve' as const;
export const NOTICE_REPAIR_ROLE_ADMIN = 'administration' as const;
export const NOTICE_REPAIR_ROLE_HEADER = 'header' as const;
export const NOTICE_REPAIR_ROLE_TECHNICIAN = 'technician' as const;

export type NoticeRepairRole =
  | typeof NOTICE_REPAIR_ROLE_INFORMER
  | typeof NOTICE_REPAIR_ROLE_APPROVE
  | typeof NOTICE_REPAIR_ROLE_ADMIN
  | typeof NOTICE_REPAIR_ROLE_HEADER
  | typeof NOTICE_REPAIR_ROLE_TECHNICIAN;

export const NOTICE_REPAIR_DEFAULT_ROLE: NoticeRepairRole = NOTICE_REPAIR_ROLE_INFORMER;

// Higher number = higher default priority when user has multiple roles
export const NOTICE_REPAIR_ROLE_PRIORITY: Record<NoticeRepairRole, number> = {
  approve: 4,
  administration: 3,
  header: 2,
  technician: 1,
  informer: 0,
};

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

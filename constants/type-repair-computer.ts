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

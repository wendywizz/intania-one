export const PROCESS = {
  success: 'successed',
  failed: 'failed',
  error: 'error',
};

export const ABSENT_TYPES = {
  leave: '1',
  business: '2',
  birth: '3',
  relax: '4',
  hajj: '6',
} as const;

export const MEETING_TYPES = {
  today: 't',
  incoming: 'c',
  history: 'p',
} as const;

export const REPAIR_STATUS = {
  newJob: '0',
  waitWorker: '2',
  workerReject: '2.1',
  workerAccept: '3',
  working: '4',
  waitCloseJob: '4.1',
  waitForeman: '4.2',
  finish: '5',
  reject: '6',
};

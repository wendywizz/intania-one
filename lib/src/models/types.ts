export type Result<T = unknown> = {
  processType: string;
  data?: T;
  message: string;
  totalCount?: number;
  success?: boolean;
};

export type AuthUser = {
  username: string;
  first_name: string;
  last_name: string;
  staff_id: string;
  email?: string;
  campus_id?: string;
  fac_id?: string;
  dept_id?: string;
  pos_id?: string;
};

export type News = {
  title: string;
  link: string;
  guid?: string;
  description?: string;
  category?: string;
  pubDate: string;
};

export type Person = {
  staffId: string;
  prefixNameTH?: string;
  titleName2?: string;
  titleName3?: string;
  firstNameTH: string;
  lastNameTH: string;
  firstNameEN?: string;
  lastNameEN?: string;
  officeTel?: string;
  website?: string;
  deptName?: string;
  email?: string;
  positionName?: string;
  staffTypeName?: string;
};

export type Meeting = {
  id?: string;
  title?: string;
  detail?: string;
  room?: string;
  startDateTime?: string;
  endDateTime?: string;
  dateTime?: string;
  [key: string]: unknown;
};

export type Absent = {
  id?: string;
  staffId?: string;
  staffFullname?: string;
  absentType?: string;
  startDate?: string;
  endDate?: string;
  totalDay?: string | number;
  reason?: string;
  status?: string;
  statusName?: string;
  [key: string]: unknown;
};

export type RepairComputer = {
  id: string;
  year?: string;
  staffId?: string;
  staffFullname?: string;
  deptName?: string;
  phone?: string;
  repairType?: string;
  repairTypeName?: string;
  detail?: string;
  informDateTime?: string;
  supplyCode?: string;
  status?: string;
  statusName?: string;
  foremanFullname?: string;
  workerFullname?: string;
  [key: string]: unknown;
};

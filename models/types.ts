export type News = {
  title: string;
  link: string;
  guid: string;
  description: string;
  category: string;
  pubDate: string;
};

export type Person = {
  staffId?: string;
  [key: string]: unknown;
};

export type RepairComputer = {
  id?: string;
  [key: string]: unknown;
};

export type RepairComputerPrivilege = {
  staffId: string;
  privilege: string;
};

export type Absent = {
  id?: string;
  [key: string]: unknown;
};

export type Meeting = {
  id?: string;
  [key: string]: unknown;
};

export type AuthUser = {
  staffId?: string;
  name?: string;
  email?: string;
  [key: string]: unknown;
};

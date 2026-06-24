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

export type absence = {
  id?: string;
  [key: string]: unknown;
};

export type Meeting = {
  id?: string;
  [key: string]: unknown;
};

export type ExamTask = {
  room_id?: string;
  room?: string;
  room_name?: string;
  date?: string;
  date_label?: string;
  time_from?: string;
  time_to?: string;
  time_from_label?: string;
  time_to_label?: string;
  period?: string;
  status?: string;
  [key: string]: unknown;
};

export type ExamSubject = {
  subject_key?: string
  subject_id?: string;  
  subject_name?: string;
  section?: string;  
  std_count?: number;     
  [key: string]: unknown;
};

export type ExamStaff = {
  staff_id?: string;
  name?: string;
  name_th?: string;
  name_en?: string;
  staff_name?: string;
  full_name?: string;
  department?: string;
  dept?: string;
  faculty?: string;
  [key: string]: unknown;
};

export type ExamDetail = {
  room_id?: string;
  room?: string;
  room_name?: string;
  date?: string;
  date_label?: string;
  time_from?: string;
  time_to?: string;
  time_from_label?: string;
  time_to_label?: string;
  year?: string;
  term?: string;
  period?: string;
  class_data?: ExamSubject[];
  staff_data?: ExamStaff[];
  [key: string]: unknown;
};

export type AuthUser = {
  staffId?: string;
  name?: string;
  email?: string;
  [key: string]: unknown;
};

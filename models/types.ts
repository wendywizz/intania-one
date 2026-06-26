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

export type MeetingAgendaItem = {
  record_id?: number;
  index?: string;
  topic?: string;
  has_pdf?: boolean;
  pdf_url?: string | null;
  pdf_pages?: number;
  [key: string]: unknown;
};

export type MeetingSubtopic = {
  record_id?: number;
  sub3_id?: number;
  index?: string;
  topic?: string;
  has_pdf?: boolean;
  pdf_url?: string | null;
  pdf_pages?: number;
  items?: MeetingAgendaItem[];
  [key: string]: unknown;
};

export type MeetingTopic = {
  record_id?: number;
  sub2_id?: number;
  index?: string;
  topic?: string;
  has_pdf?: boolean;
  pdf_url?: string | null;
  pdf_pages?: number;
  subtopics?: MeetingSubtopic[];
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

export type PublicRepairPrivilege = {
  success?: boolean;
  staff_id?: number;
  uni_staff_id?: string;
  fullname_th?: string;
  fname_th?: string;
  sname_th?: string;
  roles: string[];
  work_category_ids: number[];
  approve_dept_ids: number[];
};

export type PublicRepairJob = {
  repair_id: number;
  repair_year?: number;
  repair_numb?: number;
  repair_number?: string;
  repair_status?: string;
  repair_status_name?: string;
  repair_work_category?: number;
  work_category_name?: string;
  repair_type?: number;
  work_type_name?: string;
  repair_inform?: string;
  repair_place?: string;
  repair_tel?: string;
  repair_building?: number;
  building_name?: string;
  repair_remark?: string;
  repair_inform_dept?: number;
  repair_inform_dept_name?: string;
  repair_inform_staff?: number;
  informer_name?: string;
  repair_inform_date?: string;
  repair_inform_date_th?: string;
  repair_approve_date?: string;
  repair_administration_date?: string;
  repair_requisition?: string;
  repair_examine?: string | null;
  lastupdate?: string;
};

export type PublicRepairDetail = PublicRepairJob & {
  header?: {
    repair_header_id?: number;
    header_name?: string;
    header_date_start?: string;
    header_date_end?: string;
    repair_detail?: string;
    repair_problem?: string;
    repair_finish_date?: string;
    repair_note_date?: string;
  } | null;
  technicians?: { repair_technician?: number; name?: string; staff_type?: string }[];
  requisition?: {
    requisition_equipment?: string;
    requisition_equipment_number?: number;
    requisition_equipment_unit?: string;
    requisition_equipment_price?: number;
  }[];
  not_repair?: Record<string, unknown> | null;
  informer_name?: string;
  approve_staff_name?: string;
  admin_staff_name?: string;
};

export type PublicRepairReference = {
  work_category_id?: number;
  work_category_name?: string;
  work_type_id?: number;
  work_type_name?: string;
  building_id?: number;
  building_name?: string;
  repair_status_id?: string;
  repair_status?: string;
};

export type AuthUser = {
  staffId?: string;
  name?: string;
  email?: string;
  [key: string]: unknown;
};

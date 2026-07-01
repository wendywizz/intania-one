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

export type NoticeRepairPrivilege = {
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

export type NoticeRepairJob = {
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
  repair_examine_remark?: string | null;
  lastupdate?: string;
  // approve_new (Head/approver pending) — distinguishes new jobs from those
  // returned by the Header role, with the rejection metadata.
  pending_type?: 'new' | 'header_rejected' | string;
  repair_not_note?: string;
  not_header_staff?: string | null;
  not_header_date?: string | null;
  repair_type_label?: string;
  informer_position?: string;
};

export type NoticeRepairInformer = {
  STAFF_ID?: string;
  FNAME_TH?: string;
  SNAME_TH?: string;
  DEPT_ID?: string;
  POSITION_NAME?: string;
  DEPT_NAME_TH?: string;
};

export type NoticeRepairDetail = NoticeRepairJob & {
  informer?: NoticeRepairInformer;
  header?: {
    repair_header_id?: number;
    header_staff?: string;
    header_name?: string;
    header_date_start?: string;
    header_date_end?: string;
    repair_detail?: string;
    repair_problem?: string;
    repair_finish_date?: string;
    repair_note_date?: string;
  } | null;
  technicians?: { type?: string; staff_id?: string | null; name?: string }[];
  // full_detail / header_detail material lines (requisition_equipment rows).
  requisitions?: {
    requisition_equipment_id?: number;
    name?: string;
    number?: number;
    unit?: string;
    price_unit?: number;
    price?: number;
    /** 'd' = ผู้แจ้งจัดหาเอง, 'c' = หน่วยอาคารฯ จัดหาให้. */
    status?: string;
  }[];
  // Foreman assessment ('y' can repair) and informer examination result.
  repair?: string;
  repair_estimate?: string;
  examine?: { repair_examine?: string; repair_examine_remark?: string };
  not_repair?: Record<string, unknown> | null;
  informer_name?: string;
  approve_staff_name?: string;
  admin_staff_name?: string;
};

export type NoticeRepairReference = {
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

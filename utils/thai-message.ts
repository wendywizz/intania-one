/**
 * Server wording → something a Thai user can read.
 *
 * The upstream PHP apps and the gateway answer in English ("Insert absence
 * success", "Delete timestamp forget data success", "staff_id is required"),
 * and those strings used to reach the toast verbatim. Thai text passes through
 * untouched — it is the server's own sentence and usually the most specific
 * one there is ("อยู่นอกเครือข่ายคณะ").
 */

const THAI_CHAR = /[฀-๿]/;

export const THAI_MESSAGE = {
  SUCCESS: 'ดำเนินการเรียบร้อยแล้ว',
  SAVED: 'บันทึกข้อมูลเรียบร้อยแล้ว',
  UPDATED: 'แก้ไขข้อมูลเรียบร้อยแล้ว',
  DELETED: 'ลบข้อมูลเรียบร้อยแล้ว',
  CANCELLED: 'ยกเลิกเรียบร้อยแล้ว',
  APPROVED: 'อนุมัติเรียบร้อยแล้ว',
  REJECTED: 'ไม่อนุมัติเรียบร้อยแล้ว',
  SENT: 'ส่งข้อมูลเรียบร้อยแล้ว',
  UPLOADED: 'อัปโหลดเรียบร้อยแล้ว',
  FAILED: 'ดำเนินการไม่สำเร็จ',
  CANNOT_CONNECT: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้',
  TIMEOUT: 'หมดเวลาการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง',
  SERVER_ERROR: 'เซิร์ฟเวอร์ขัดข้อง',
  REQUIRED: 'กรุณากรอกข้อมูลให้ครบถ้วน',
  INVALID: 'ข้อมูลไม่ถูกต้อง',
  NOT_FOUND: 'ไม่พบข้อมูล',
  FORBIDDEN: 'ไม่มีสิทธิ์ดำเนินการ',
  DUPLICATE: 'มีข้อมูลนี้อยู่แล้ว',
  OVERLAP: 'ช่วงเวลานี้ซ้ำกับรายการที่มีอยู่แล้ว',
  FILE_TYPE: 'รองรับเฉพาะไฟล์รูปภาพ JPEG หรือ PNG',
  FILE_TOO_LARGE: 'ไฟล์มีขนาดใหญ่เกินกำหนด',
  CANNOT_OPEN_FILE: 'ไม่สามารถเปิดไฟล์ได้',
  USER_CANCELLED: 'ยกเลิกการดำเนินการแล้ว',
} as const;

export function hasThai(text: string) {
  return THAI_CHAR.test(text);
}

/**
 * The message if it is already Thai, '' otherwise — for services, so a screen's
 * `result.message || TEXT.<specific Thai fallback>` picks its own fallback.
 */
export function thaiOnly(message: unknown) {
  const text = String(message ?? '').trim();
  return hasThai(text) ? text : '';
}

// Order matters: the first match wins, so the narrower phrases come first.
const ERROR_RULES: [RegExp, string][] = [
  [/was cancell?ed/i, THAI_MESSAGE.USER_CANCELLED],
  [/network request failed|unable to connect|cannot connect|failed to fetch|econn|connection/i, THAI_MESSAGE.CANNOT_CONNECT],
  [/time(d)?\s?out|abort/i, THAI_MESSAGE.TIMEOUT],
  [/jpe?g|png|image type|file type/i, THAI_MESSAGE.FILE_TYPE],
  [/too large|larger than|file size|payload/i, THAI_MESSAGE.FILE_TOO_LARGE],
  [/open file/i, THAI_MESSAGE.CANNOT_OPEN_FILE],
  [/overlap|conflict|already (booked|reserved)|not available/i, THAI_MESSAGE.OVERLAP],
  [/duplicate|already exists?/i, THAI_MESSAGE.DUPLICATE],
  [/required|missing|empty/i, THAI_MESSAGE.REQUIRED],
  [/not found|no .*record|does not exist/i, THAI_MESSAGE.NOT_FOUND],
  [/unauthori[sz]ed|forbidden|permission|not allowed|access denied|signature|token/i, THAI_MESSAGE.FORBIDDEN],
  [/invalid|malformed|must be|bad request|validation/i, THAI_MESSAGE.INVALID],
  [/internal server|server error|server request failed|bad gateway|unavailable|502|503|500/i, THAI_MESSAGE.SERVER_ERROR],
];

const SUCCESS_RULES: [RegExp, string][] = [
  [/delet|remov/i, THAI_MESSAGE.DELETED],
  [/cancel/i, THAI_MESSAGE.CANCELLED],
  [/reject|disapprov|not approv/i, THAI_MESSAGE.REJECTED],
  [/approv/i, THAI_MESSAGE.APPROVED],
  [/upload/i, THAI_MESSAGE.UPLOADED],
  [/updat|edit|chang|modif/i, THAI_MESSAGE.UPDATED],
  [/send|sent|submit/i, THAI_MESSAGE.SENT],
  [/insert|add|creat|save|book|record|stamp/i, THAI_MESSAGE.SAVED],
];

/** Any message the app is about to show, in Thai. */
export function toThaiMessage(message: string, type: 'success' | 'error' = 'success') {
  const text = String(message ?? '').trim();
  if (!text || hasThai(text)) return text;

  const rules = type === 'error' ? ERROR_RULES : SUCCESS_RULES;
  const hit = rules.find(([pattern]) => pattern.test(text));
  if (hit) return hit[1];

  return type === 'error' ? THAI_MESSAGE.FAILED : THAI_MESSAGE.SUCCESS;
}

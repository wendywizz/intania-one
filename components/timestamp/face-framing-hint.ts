import { TEXT } from '@/constants/text';
import type { FramingVerdict } from '@/utils/face-framing';

/** What the line under the guide oval says for each verdict on where the face sits. */
export const FRAMING_HINT: Record<FramingVerdict, string> = {
  ok: TEXT.STAFF_FACE_HINT_BLINK,
  none: TEXT.STAFF_FACE_HINT_NONE,
  many: TEXT.STAFF_FACE_HINT_MANY,
  off_center: TEXT.STAFF_FACE_HINT_OFF_CENTER,
  too_far: TEXT.STAFF_FACE_HINT_TOO_FAR,
  too_close: TEXT.STAFF_FACE_HINT_TOO_CLOSE,
  turned: TEXT.STAFF_FACE_HINT_TURNED,
};

import { TEXT } from '@/constants/text';
import type { FramingVerdict } from '@/utils/face-framing';

/** What the line under the guide oval says for each verdict on where the face sits. */
export const FRAMING_HINT: Record<FramingVerdict, string> = {
  get ok() { return TEXT.STAFF_FACE_HINT_BLINK; },
  get none() { return TEXT.STAFF_FACE_HINT_NONE; },
  get many() { return TEXT.STAFF_FACE_HINT_MANY; },
  get off_center() { return TEXT.STAFF_FACE_HINT_OFF_CENTER; },
  get too_far() { return TEXT.STAFF_FACE_HINT_TOO_FAR; },
  get too_close() { return TEXT.STAFF_FACE_HINT_TOO_CLOSE; },
  get turned() { return TEXT.STAFF_FACE_HINT_TURNED; },
};

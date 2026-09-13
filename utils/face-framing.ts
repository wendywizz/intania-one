/**
 * Is the face placed where the scan can use it?
 *
 * The scan screen draws an oval and asks the person to put their face in it.
 * This says whether they have — and if not, which way is wrong — from the face
 * boxes ML Kit reports in the camera view's own coordinates (the detector runs
 * with `autoMode`, which does the rotation and mirroring on the native side).
 *
 * It only guides the person and gates when a picture is worth taking. Whose
 * face it is, and whether it matches, is decided by the server.
 */

export type FaceBox = { x: number; y: number; width: number; height: number };
export type ViewSize = { width: number; height: number };

export type FramingVerdict =
  | 'ok'
  /** No face in view. */
  | 'none'
  /** More than one face — whose would be sent is ambiguous. */
  | 'many'
  | 'off_center'
  | 'too_far'
  | 'too_close';

/**
 * The guide oval, in view coordinates. Also used to draw it, so what the
 * person sees and what this checks cannot drift apart.
 */
export function guideOval(view: ViewSize) {
  const width = view.width * 0.72;
  const height = Math.min(width * 1.32, view.height * 0.7);

  return {
    cx: view.width / 2,
    cy: view.height * 0.44,
    rx: width / 2,
    ry: height / 2,
  };
}

export function judgeFraming(faces: FaceBox[], view: ViewSize): FramingVerdict {
  if (faces.length === 0 || view.width <= 0 || view.height <= 0) return 'none';
  if (faces.length > 1) return 'many';

  const [face] = faces;
  const oval = guideOval(view);

  // Size first: a face too far away is also usually off-centre, and "come
  // closer" is the instruction that fixes both.
  const widthRatio = face.width / (oval.rx * 2);
  if (widthRatio < 0.45) return 'too_far';
  if (widthRatio > 1.25) return 'too_close';

  const faceCx = face.x + face.width / 2;
  const faceCy = face.y + face.height / 2;
  // Normalised distance of the face centre from the oval centre, in units of
  // the oval's radii. Within 0.35 is comfortably inside.
  const dx = (faceCx - oval.cx) / oval.rx;
  const dy = (faceCy - oval.cy) / oval.ry;
  if (dx * dx + dy * dy > 0.35 * 0.35) return 'off_center';

  return 'ok';
}

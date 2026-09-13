/**
 * Face placement against the guide oval, on a 390 × 700 camera view (a common
 * phone width). The oval is 281 px wide, centred at (195, 308).
 */
import { judgeFraming } from '@/utils/face-framing';

const VIEW = { width: 390, height: 700 };

describe('judgeFraming', () => {
  it('accepts one face filling the oval', () => {
    expect(judgeFraming([{ x: 75, y: 170, width: 240, height: 280 }], VIEW)).toBe('ok');
  });

  it('reports no face', () => {
    expect(judgeFraming([], VIEW)).toBe('none');
  });

  it('refuses two faces, since whose would be sent is ambiguous', () => {
    const face = { x: 75, y: 170, width: 240, height: 280 };
    expect(judgeFraming([face, { ...face, x: 10 }], VIEW)).toBe('many');
  });

  it('asks a small, distant face to come closer', () => {
    expect(judgeFraming([{ x: 165, y: 280, width: 60, height: 70 }], VIEW)).toBe('too_far');
  });

  it('asks a face larger than the oval to move back', () => {
    expect(judgeFraming([{ x: -20, y: 60, width: 430, height: 500 }], VIEW)).toBe('too_close');
  });

  it('asks a face at the edge of the view to move into the oval', () => {
    expect(judgeFraming([{ x: 200, y: 170, width: 200, height: 240 }], VIEW)).toBe('off_center');
  });
});

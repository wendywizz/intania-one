import {
  abbreviatePrefix,
  getInitial,
  getThaiNamePrefix,
  pickTone,
  splitHighlight,
  splitPhones,
  toPhotoStaffId,
} from '@/utils/person-search';

describe('splitHighlight', () => {
  it('marks the keyword inside a Thai name', () => {
    expect(splitHighlight('ณรงค์ชัย', 'ชัย')).toEqual([
      { text: 'ณรงค์', match: false },
      { text: 'ชัย', match: true },
    ]);
  });

  it('marks every occurrence, and the middle of a word', () => {
    expect(splitHighlight('วีระชัยชัยา', 'ชัย')).toEqual([
      { text: 'วีระ', match: false },
      { text: 'ชัย', match: true },
      { text: 'ชัย', match: true },
      { text: 'า', match: false },
    ]);
  });

  it('ignores case and surrounding spaces in the keyword', () => {
    expect(splitHighlight('Somchai', ' CHAI ')).toEqual([
      { text: 'Som', match: false },
      { text: 'chai', match: true },
    ]);
  });

  it('marks nothing for a keyword under two characters or no match', () => {
    expect(splitHighlight('ชัย', 'ช')).toEqual([{ text: 'ชัย', match: false }]);
    expect(splitHighlight('แซ่ลิ้ม', 'ชัย')).toEqual([{ text: 'แซ่ลิ้ม', match: false }]);
    expect(splitHighlight('', 'ชัย')).toEqual([]);
  });
});

describe('splitPhones', () => {
  it('splits the separators OFFICE_TEL uses and drops repeats', () => {
    expect(splitPhones('7440, 7441')).toEqual(['7440', '7441']);
    expect(splitPhones('7440/7441')).toEqual(['7440', '7441']);
    expect(splitPhones('7440 7441 7440')).toEqual(['7440', '7441']);
  });

  it('keeps one number whole', () => {
    expect(splitPhones('749939')).toEqual(['749939']);
    expect(splitPhones('074-287017')).toEqual(['074-287017']);
    expect(splitPhones('  ')).toEqual([]);
  });
});

describe('getInitial', () => {
  it('takes the first consonant, skipping a leading Thai vowel', () => {
    expect(getInitial('ณรงค์ชัย')).toBe('ณ');
    expect(getInitial('เกษม')).toBe('ก');
    expect(getInitial(' somchai')).toBe('S');
    expect(getInitial('')).toBe('');
  });
});

describe('pickTone', () => {
  it('is stable and in range', () => {
    expect(pickTone('0999911', 4)).toBe(pickTone('0999911', 4));
    expect(pickTone('0999911', 4)).toBeGreaterThanOrEqual(0);
    expect(pickTone('0999911', 4)).toBeLessThan(4);
    expect(pickTone('x', 0)).toBe(0);
  });
});

describe('toPhotoStaffId', () => {
  it('zero-pads numeric ids to seven digits for the photo endpoint', () => {
    expect(toPhotoStaffId('1234')).toBe('0001234');
    expect(toPhotoStaffId(999911)).toBe('0999911');
    expect(toPhotoStaffId(' 0999911 ')).toBe('0999911');
  });

  it('passes non-numeric ids through and treats missing as empty', () => {
    expect(toPhotoStaffId('A12')).toBe('A12');
    expect(toPhotoStaffId(undefined)).toBe('');
  });
});

describe('getThaiNamePrefix', () => {
  it('puts the academic rank and degree in front, like eng-person', () => {
    expect(
      getThaiNamePrefix({ P_NAME_TH: 'นาย', TITLE_NAME2: 'ผศ.', TITLE_NAME3: 'ดร.' }),
    ).toBe('ผศ. ดร.');
    expect(getThaiNamePrefix({ P_NAME_TH: 'นาย', TITLE_NAME2: 'รศ.', TITLE_NAME3: 'NULL' })).toBe('รศ.');
    expect(getThaiNamePrefix({ P_NAME_TH: 'นาง', TITLE_NAME3: 'ดร.' })).toBe('ดร.');
  });

  it('falls back to the plain title, shortening นางสาว', () => {
    expect(getThaiNamePrefix({ P_NAME_TH: 'นางสาว', TITLE_NAME2: 'NULL', TITLE_NAME3: null })).toBe('น.ส.');
    expect(getThaiNamePrefix({ P_NAME_TH: 'นาย' })).toBe('นาย');
    expect(getThaiNamePrefix({})).toBe('');
  });

  it('shortens spelled-out academic ranks', () => {
    expect(abbreviatePrefix('ผู้ช่วยศาสตราจารย์')).toBe('ผศ.');
    expect(abbreviatePrefix(' รองศาสตราจารย์ ')).toBe('รศ.');
  });
});

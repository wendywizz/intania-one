import { getInitial, pickTone, splitHighlight, splitPhones } from '@/utils/person-search';

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

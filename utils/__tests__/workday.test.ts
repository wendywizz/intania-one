/**
 * The working-day bar on both ลงเวลา screens. The day is 08:30-16:30.
 */
import { minutesOfDay, workdayProgress, workedLabel, workedMinutes } from '@/utils/workday';

const at = (hhmm: string) => minutesOfDay(hhmm);

describe('workdayProgress', () => {
  it('is empty before the day starts', () => {
    expect(workdayProgress(at('07:10'))).toBe(0);
    expect(workdayProgress(at('08:30'))).toBe(0);
  });

  it('is half full at 12:30, halfway through an eight-hour day', () => {
    expect(workdayProgress(at('12:30'))).toBe(0.5);
  });

  it('is full at 16:30 and stays full after', () => {
    expect(workdayProgress(at('16:30'))).toBe(1);
    expect(workdayProgress(at('19:45'))).toBe(1);
  });
});

describe('workedMinutes', () => {
  it('counts from the arrival stamp to now while the day is open', () => {
    expect(workedMinutes('08:44:00', '', at('14:22'))).toBe(338);
  });

  it('stops at the departure stamp once there is one', () => {
    expect(workedMinutes('08:44:00', '16:40:00', at('18:00'))).toBe(476);
  });

  it('has nothing to measure before an arrival', () => {
    expect(workedMinutes('', '', at('10:00'))).toBeNull();
  });
});

describe('minutesOfDay', () => {
  it('reads both HH:MM and HH:MM:SS', () => {
    expect(minutesOfDay('08:44')).toBe(524);
    expect(minutesOfDay('08:44:59')).toBe(524);
  });

  it('is -1 for no time', () => {
    expect(minutesOfDay('')).toBe(-1);
  });
});

describe('workedLabel', () => {
  it('writes hours and two-digit minutes', () => {
    expect(workedLabel(338)).toBe('ทำงานแล้ว 5 ชม. 38 น.');
    expect(workedLabel(65)).toBe('ทำงานแล้ว 1 ชม. 05 น.');
  });
});

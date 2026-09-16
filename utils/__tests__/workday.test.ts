/**
 * The working-day bar on the staff ลงเวลา screen. The day is 08:30-16:30, and
 * it is the day that drives the bar, not the person's stamps.
 */
import { minutesOfDay, workdayProgress, workdayState, workedLabel } from '@/utils/workday';

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

describe('workdayState', () => {
  it('counts from the arrival stamp while the day is open', () => {
    const day = workdayState('08:44:00', '', at('14:22'));

    expect(day.worked).toBe(338);
    expect(day.spent).toBe(false);
  });

  it('credits an early arrival from 08:30, not from the stamp', () => {
    // In at 07:50, so 08:30 to 10:00 is the hour and a half that counts.
    expect(workdayState('07:50:00', '', at('10:00')).worked).toBe(90);
  });

  it('has worked nothing yet while an early arrival waits for 08:30', () => {
    expect(workdayState('07:50:00', '', at('08:10')).worked).toBe(0);
  });

  it('stops at the departure stamp, however long ago that was', () => {
    const day = workdayState('08:44:00', '15:00:00', at('15:47'));

    expect(day.worked).toBe(376);
    expect(day.fill).toBe(workdayProgress(at('15:00')));
    expect(day.spent).toBe(true);
  });

  it('closes the day at 16:30 with a full grey bar and no running total', () => {
    const day = workdayState('08:44:00', '', at('17:20'));

    expect(day.fill).toBe(1);
    expect(day.worked).toBeNull();
    expect(day.spent).toBe(true);
  });

  it('shows nothing at all without an arrival stamp, at any hour', () => {
    expect(workdayState('', '', at('10:00'))).toEqual({ fill: 0, worked: null, spent: true });
    expect(workdayState('', '', at('17:20'))).toEqual({ fill: 0, worked: null, spent: true });
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

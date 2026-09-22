/**
 * How a leave's dates read on the approver's list (absence-list-item ->
 * formatDateRange). Upstreams hand back C.E. dates (the website's own
 * date_to_thai() converts them), and some Phoenix fields come back already in
 * B.E.; either way the app must show the Thai year once, not twice.
 * Expected strings are written out, not rebuilt the way the code builds them.
 */
import { formatDateRange, formatFullDate } from '@/utils/date-format';

describe('formatDateRange', () => {
  it('shows a one-day C.E. leave in the Thai year', () => {
    expect(formatDateRange('2026-09-22', '2026-09-22')).toBe('22 กันยายน 2569');
  });

  it('shows a leave inside one month as a day range', () => {
    expect(formatDateRange('2026-09-22', '2026-09-24')).toBe('22 - 24 กันยายน 2569');
  });

  it('does not add 543 again to a date already in B.E. (year first)', () => {
    expect(formatDateRange('2569-09-22', '2569-09-22')).toBe('22 กันยายน 2569');
  });

  it('does not add 543 again to a date already in B.E. (day first)', () => {
    expect(formatDateRange('22/09/2569', '22/09/2569')).toBe('22 กันยายน 2569');
  });
});

describe('formatFullDate', () => {
  it('reads a C.E. timestamp in the Thai year', () => {
    expect(formatFullDate('2026-09-22 09:30:00')).toContain('2569');
  });
});

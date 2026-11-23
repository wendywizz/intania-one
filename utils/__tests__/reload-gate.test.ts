import { reloadDecision, type LoadTrigger } from '@/utils/reload-gate';

const GAP = 2000;

function decide(trigger: LoadTrigger, { loading = false, sinceLast = 60_000 } = {}) {
  return reloadDecision({ trigger, loading, now: 100_000, lastLoadAt: 100_000 - sinceLast, minResumeGapMs: GAP });
}

describe('reloadDecision', () => {
  it('runs every trigger when idle and the last load is old', () => {
    expect(decide('initial')).toBe('run');
    expect(decide('refresh')).toBe('run');
    expect(decide('resume')).toBe('run');
  });

  it('a pull right after a load still runs — the person asked for a fresh check', () => {
    expect(decide('refresh', { sinceLast: 0 })).toBe('run');
    expect(decide('refresh', { sinceLast: GAP - 1 })).toBe('run');
  });

  it('a resume inside the gap is dropped (Android permission pause)', () => {
    expect(decide('resume', { sinceLast: GAP - 1 })).toBe('skip');
    expect(decide('resume', { sinceLast: GAP })).toBe('run');
  });

  it('a pull during a load is queued, not dropped', () => {
    expect(decide('refresh', { loading: true })).toBe('queue');
  });

  it('a resume or an initial load during a load is dropped', () => {
    expect(decide('resume', { loading: true })).toBe('skip');
    expect(decide('initial', { loading: true })).toBe('skip');
  });
});

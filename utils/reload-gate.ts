/**
 * Whether a screen load asked for now runs, waits for the one in flight, or is
 * dropped.
 *
 * - `initial`: the screen opening (or the error state's retry).
 * - `refresh`: the person asked — pull-to-refresh or a "try again" button.
 * - `resume`: the app came back to the foreground.
 *
 * Only one load runs at a time. A person's refresh that lands on a load in
 * flight is queued, not dropped: that load may have read a network the phone
 * has since left (back from Settings on 4G, now on the faculty WiFi), and
 * dropping the pull leaves the screen stuck on that old answer.
 *
 * The minimum gap applies to `resume` alone. It is there to swallow the
 * pause-and-resume an Android permission check causes; a person pulling the
 * screen is never that, and must always get a fresh check.
 */
export type LoadTrigger = 'initial' | 'refresh' | 'resume';
export type ReloadDecision = 'run' | 'queue' | 'skip';

export function reloadDecision({
  trigger,
  loading,
  now,
  lastLoadAt,
  minResumeGapMs,
}: {
  trigger: LoadTrigger;
  loading: boolean;
  now: number;
  lastLoadAt: number;
  minResumeGapMs: number;
}): ReloadDecision {
  if (loading) return trigger === 'refresh' ? 'queue' : 'skip';
  if (trigger === 'resume' && now - lastLoadAt < minResumeGapMs) return 'skip';
  return 'run';
}

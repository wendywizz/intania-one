/**
 * Client error capture (scooba-insight T10). Three doors, one report shape:
 *
 * - `boundary` — a render error caught by the root `ErrorBoundary`
 *   (app/_layout.tsx → components/app-error-boundary.tsx);
 * - `global`   — `ErrorUtils.setGlobalHandler`: an uncaught JS error, `fatal`
 *   when React Native is about to tear the app down;
 * - `promise`  — an unhandled promise rejection (Hermes rejection tracker,
 *   release builds only — in dev React Native's own tracker feeds LogBox).
 *
 * Each becomes one `error` telemetry event: name = error class, props =
 * { source, fatal, message, stack, route } with message/stack scrubbed and
 * clipped (the server scrubs again). A fatal crash is written to storage before
 * the previous handler runs, so it is sent on the next launch. The previous
 * handler always runs — red box / LogBox in dev, the native crash in release
 * are unchanged.
 */
import { getTelemetryRoute, persistTelemetry, scrubText, track } from './telemetryService';

export type ErrorSource = 'boundary' | 'global' | 'promise' | 'other';

/** The same error reported twice in a row within this window counts once. */
const DEDUPE_MS = 2000;
const STACK_FRAMES = 8;
let last: { key: string; at: number } | null = null;

function errorName(error: unknown): string {
  if (error instanceof Error) return error.name || error.constructor?.name || 'Error';
  if (error && typeof error === 'object' && typeof (error as { name?: unknown }).name === 'string') {
    return (error as { name: string }).name || 'Error';
  }
  return typeof error === 'string' ? 'StringError' : 'NonError';
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && typeof (error as { message?: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  try {
    return JSON.stringify(error) ?? String(error);
  } catch {
    return String(error);
  }
}

/** The top frames only, with bundle URLs reduced to their file name. */
export function shortStack(stack: unknown): string {
  if (typeof stack !== 'string' || !stack) return '';
  return stack
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, STACK_FRAMES)
    .map((line) => line.replace(/(?:https?|file):\/\/[^\s)]*\/([^/\s)?]+)(?:\?[^\s)]*)?/g, '$1'))
    .join('\n');
}

export function reportError(
  error: unknown,
  options: { source: ErrorSource; fatal?: boolean; componentStack?: string | null },
): void {
  try {
    const name = errorName(error).replace(/[^A-Za-z0-9_$.]/g, '').slice(0, 80) || 'Error';
    const message = scrubText(errorMessage(error), 300);
    const key = `${options.source}|${name}|${message}`;
    const now = Date.now();
    if (last && last.key === key && now - last.at < DEDUPE_MS) return;
    last = { key, at: now };

    const stack = shortStack(error instanceof Error ? error.stack : undefined)
      || shortStack(options.componentStack);
    track('error', name, {
      source: options.source,
      fatal: Boolean(options.fatal),
      message,
      stack: scrubText(stack, 1000),
      route: getTelemetryRoute() ?? undefined,
    });
  } catch {
    // reporting must never throw into the code that failed
  }
}

type GlobalHandler = (error: unknown, isFatal?: boolean) => void;
type ErrorUtilsLike = {
  getGlobalHandler?: () => GlobalHandler | undefined;
  setGlobalHandler: (handler: GlobalHandler) => void;
};
type RejectionTracker = (options: {
  allRejections: boolean;
  onUnhandled: (id: number, rejection?: unknown) => void;
  onHandled: (id: number) => void;
}) => void;

let installed = false;

function errorUtils(): ErrorUtilsLike | null {
  const candidate = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
  return candidate && typeof candidate.setGlobalHandler === 'function' ? candidate : null;
}

function rejectionTracker(): RejectionTracker | null {
  const hermes = (globalThis as {
    HermesInternal?: { enablePromiseRejectionTracker?: RejectionTracker };
  }).HermesInternal;
  if (typeof hermes?.enablePromiseRejectionTracker === 'function') {
    return hermes.enablePromiseRejectionTracker.bind(hermes);
  }
  // JSC/web: no tracker (the app ships on Hermes; `promise` is only transitive).
  return null;
}

/**
 * Hook the global JS error handler and the unhandled-rejection tracker. Safe to
 * call more than once; the first call wins.
 */
export function installGlobalErrorHandlers(): void {
  if (installed) return;
  installed = true;

  const utils = errorUtils();
  if (utils) {
    const previous = utils.getGlobalHandler?.();
    utils.setGlobalHandler((error, isFatal) => {
      reportError(error, { source: 'global', fatal: Boolean(isFatal) });
      if (isFatal) {
        // Best effort: the write may or may not land before the process dies.
        void persistTelemetry();
      }
      previous?.(error, isFatal);
    });
  }

  // In dev, React Native's own tracker feeds LogBox — leave it be.
  const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
  if (isDev) return;
  const enable = rejectionTracker();
  enable?.({
    allRejections: true,
    onUnhandled: (_id, rejection) => reportError(rejection, { source: 'promise', fatal: false }),
    onHandled: () => undefined,
  });
}

/** Test-only reset. */
export function __resetErrorReportingForTests() {
  installed = false;
  last = null;
}

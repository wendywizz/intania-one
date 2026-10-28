/**
 * T10 — the root ErrorBoundary screen: it renders outside every provider,
 * reports the render error exactly once, and "retry" re-renders.
 */
jest.mock('@/services/errorReporting', () => ({ reportError: jest.fn() }));
jest.mock('@/services/telemetryService', () => ({ flushTelemetry: jest.fn(async () => undefined) }));

import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { AppErrorBoundary } from '@/components/app-error-boundary';
import { reportError } from '@/services/errorReporting';
import { flushTelemetry } from '@/services/telemetryService';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

test('reports once, flushes, and retries on press', async () => {
  const error = new TypeError('render failed');
  const retry = jest.fn(async () => undefined);
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(<AppErrorBoundary error={error} retry={retry} />);
  });
  await act(async () => {
    tree.update(<AppErrorBoundary error={error} retry={retry} />);
  });

  expect(reportError).toHaveBeenCalledTimes(1);
  expect(reportError).toHaveBeenCalledWith(error, { source: 'boundary', fatal: false });
  expect(flushTelemetry).toHaveBeenCalled();

  const button = tree.root.findByProps({ testID: 'app-error-boundary-retry' });
  await act(async () => {
    button.props.onPress();
  });
  expect(retry).toHaveBeenCalledTimes(1);
  act(() => {
    tree.unmount();
  });
});

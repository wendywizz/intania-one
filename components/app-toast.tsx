import { useEffect, useRef } from 'react';

import { useToast, type ToastType } from '@/components/toast-provider';

type AppToastProps = {
  message: string;
  type?: ToastType;
};

/**
 * Back-compat shim around the global top-sliding toast (see ToastProvider).
 * Existing screens render `<AppToast message={state} type=... />`; this forwards
 * the message to the app-wide toast whenever it becomes non-empty, so all those
 * call sites get the new slide-down-from-top toast without changes.
 */
export function AppToast({ message, type = 'success' }: AppToastProps) {
  const { showToast } = useToast();
  const last = useRef('');

  useEffect(() => {
    if (message && message !== last.current) {
      last.current = message;
      showToast(message, type);
    } else if (!message) {
      last.current = '';
    }
  }, [message, type, showToast]);

  return null;
}

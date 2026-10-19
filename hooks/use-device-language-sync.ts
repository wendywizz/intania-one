import { useEffect, useRef } from 'react';

import { useLanguage } from '@/context/LanguageContext';
import type { AuthUser } from '@/models/types';
import { syncDeviceLanguage } from '@/services/deviceService';

/**
 * Keeps the gateway's idea of this phone's language in step with the app's, so a push
 * is written in the language the person chose in Settings. Runs when the language
 * changes and when someone signs in; `syncDeviceLanguage` makes the unchanged case free.
 */
export function useDeviceLanguageSync(user: AuthUser | null) {
  const { language } = useLanguage();
  const userRef = useRef(user);
  userRef.current = user;
  const signedInAs = user?.staffId ?? null;

  useEffect(() => {
    const current = userRef.current;
    if (!current || !signedInAs) return;
    void syncDeviceLanguage(current).catch(() => null);
  }, [language, signedInAs]);
}

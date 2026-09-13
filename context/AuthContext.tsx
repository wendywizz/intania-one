import React, {createContext, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {AppState} from 'react-native';
import type {AuthUser} from '../models/types';
import * as authService from '../services/authService';
import {registerLoggedInDevice, subscribeToLoggedInDevicePushTokenChanges} from '../services/deviceService';
import {
  fetchStaffEligibility,
  readCachedEligibility,
  readCachedIsCompOtEligible,
  readCachedIsLecturer,
  readCachedStampRole,
  writeCachedEligibility,
  writeCachedIsCompOtEligible,
  writeCachedIsLecturer,
  writeCachedStampRole,
} from '../services/staffInfoService';
import type {StaffStampRole} from '../services/timestampService';
import {DEV_STAFF_ID} from '../constants/devConfig';

/**
 * Whether the signed-in person is Faculty of Engineering staff.
 *
 * `unknown` is deliberately distinct from `denied`: it means the check has not
 * run or could not complete, and it is treated as "let them in". The gate exists
 * to keep other faculties' staff out of a UI that is useless to them, not as a
 * security boundary — every module endpoint is reachable without it — so failing
 * open on a dropped connection is far better than locking out real staff.
 */
export type StaffEligibilityStatus = 'unknown' | 'checking' | 'allowed' | 'denied';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  /**
   * True only until the stored session has been restored, once per launch.
   *
   * Distinct from `loading`, which also goes true while a sign-in or sign-out
   * runs. Anything that holds the navigator back must use this one: gating on
   * `loading` unmounts the whole app mid-sign-in, which shows as a white screen
   * rather than as progress.
   */
  initializing: boolean;
  signedIn: boolean;
  /** Faculty check for `user`; see StaffEligibilityStatus. */
  eligibility: StaffEligibilityStatus;
  /**
   * Whether `user` is teaching staff — what the lecturer-stamping tab is gated
   * on.
   *
   * A plain boolean rather than a three-state like `eligibility`: this one only
   * hides a tab, so "we do not know yet" and "no" lead to the same screen. It
   * is answered by the gateway from CENTRAL.STAFF_INFO.POSITION_ID — PSU
   * Passport carries no claim about position, so it cannot come from the token.
   */
  isLecturer: boolean;
  /** `lecturer` | `guard` | `staff` — which stamping screen this account uses. */
  stampRole: StaffStampRole;
  /**
   * Whether `user` may use the "เวรห้องคอมพิวเตอร์" (scooba-comp-ot) home tile.
   *
   * Same shape as `isLecturer`: answered by the gateway from
   * CENTRAL.STAFF_INFO.DEPT_ID (dept 209), so the app holds no copy of which
   * department qualifies.
   */
  isCompOtEligible: boolean;
  completeWebSignIn: (params: Parameters<typeof authService.completeWebLogin>[0]) => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * The staff id every feature actually works with — the same dev impersonation
 * override `effectiveUser` applies, so the faculty check cannot disagree with the
 * account the rest of the app is showing.
 */
function resolveStaffId(user: AuthUser | null): string | undefined {
  if (!user) {
    return undefined;
  }

  return __DEV__ && DEV_STAFF_ID ? DEV_STAFF_ID : user.staffId;
}

function registerDeviceInBackground(user: AuthUser | null) {
  if (!user) {
    return;
  }

  registerLoggedInDevice(user).catch((error) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[push] device registration failed', error);
    }
  });
}

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [eligibility, setEligibility] = useState<StaffEligibilityStatus>('unknown');
  // Resolved by the same call as `eligibility` — one request answers both, so
  // they can never disagree about which account they describe.
  const [isLecturer, setIsLecturer] = useState(false);
  // Which stamping screen this account belongs on. Resolved by the same call,
  // so it can never disagree with `isLecturer` about the same person.
  const [stampRole, setStampRole] = useState<StaffStampRole>('staff');
  // Resolved by the same call too — see isLecturer above.
  const [isCompOtEligible, setIsCompOtEligible] = useState(false);
  const signInPromiseRef = useRef<Promise<void> | null>(null);
  const userRef = useRef<AuthUser | null>(null);
  // Guards against a stale check overwriting a newer one — a slow reply for the
  // previous account must not decide the current account's verdict.
  const eligibilityRunRef = useRef(0);

  /**
   * Resolves `staffId`'s faculty and records the verdict. Seeds from the cached
   * verdict first so a returning user does not flash the wrong home screen while
   * the network call runs.
   */
  const verifyEligibility = React.useCallback(async (staffId: string | undefined) => {
    const run = ++eligibilityRunRef.current;
    const isCurrent = () => eligibilityRunRef.current === run;

    // No staff id means nothing to check against — fail open rather than
    // stranding the user on an empty home screen.
    if (!staffId) {
      if (isCurrent()) {
        setEligibility('unknown');
        setIsLecturer(false);
        setIsCompOtEligible(false);
      }
      return;
    }

    const [cached, cachedLecturer, cachedRole, cachedCompOt] = await Promise.all([
      readCachedEligibility(staffId),
      readCachedIsLecturer(staffId),
      readCachedStampRole(staffId),
      readCachedIsCompOtEligible(staffId),
    ]);
    if (!isCurrent()) return;
    setEligibility(cached === null ? 'checking' : cached ? 'allowed' : 'denied');
    // Null (never asked) is treated as "not a lecturer": the tab simply is not
    // there yet, and the re-check below adds it a moment later. The opposite
    // default would flash a tab at everyone on their first launch.
    setIsLecturer(cachedLecturer === true);
    // 'staff' is the majority and the safe first guess: it shows a read-only
    // screen, so a wrong guess costs a redraw rather than a wrong action.
    setStampRole(cachedRole ?? 'staff');
    // Same reasoning as isLecturer: null (never asked) means "no tile yet".
    setIsCompOtEligible(cachedCompOt === true);

    try {
      const result = await fetchStaffEligibility(staffId);
      await Promise.all([
        writeCachedEligibility(staffId, result.eligible),
        writeCachedIsLecturer(staffId, result.isLecturer),
        writeCachedStampRole(staffId, result.stampRole),
        writeCachedIsCompOtEligible(staffId, result.isCompOtEligible),
      ]);
      if (isCurrent()) {
        setEligibility(result.eligible ? 'allowed' : 'denied');
        setIsLecturer(result.isLecturer);
        setStampRole(result.stampRole);
        setIsCompOtEligible(result.isCompOtEligible);
      }
    } catch (error) {
      // Could not reach the gateway. Keep whatever the cache said; with no cached
      // verdict, fall back to 'unknown' (= allowed) rather than turning a network
      // failure into "you have no permission".
      if (isCurrent() && cached === null) setEligibility('unknown');
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[auth] eligibility check failed', error);
      }
    }
  }, []);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    authService
      .restoreSession()
      .then((restoredUser) => {
        setUser(restoredUser);
        registerDeviceInBackground(restoredUser);
        // Not awaited: cold start must not wait on the network. The cached
        // verdict settles the screen immediately and the re-check corrects it.
        void verifyEligibility(resolveStaffId(restoredUser));
      })
      .finally(() => {
        setLoading(false);
        setInitializing(false);
      });
  }, [verifyEligibility]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        registerDeviceInBackground(userRef.current);
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    return subscribeToLoggedInDevicePushTokenChanges(user);
  }, [user]);

  const effectiveUser: AuthUser | null = user && __DEV__ && DEV_STAFF_ID ? {...user, staffId: DEV_STAFF_ID} : user;

  const value = useMemo<AuthContextValue>(
    () => ({
      user: effectiveUser,
      loading,
      initializing,
      signedIn: Boolean(effectiveUser),
      eligibility,
      isLecturer,
      stampRole,
      isCompOtEligible,
      completeWebSignIn: async (params) => {
        setLoading(true);
        try {
          const signedInUser = await authService.completeWebLogin(params);
          setUser(signedInUser);
          registerDeviceInBackground(signedInUser);
          // Awaited on the login path, unlike on restore: the verdict decides
          // which home screen this person gets, and settling it before `loading`
          // clears means they never see the wrong one flash first.
          await verifyEligibility(resolveStaffId(signedInUser));
        } finally {
          setLoading(false);
        }
      },
      signIn: async () => {
        if (signInPromiseRef.current) {
          return signInPromiseRef.current;
        }

        setLoading(true);
        signInPromiseRef.current = authService
          .login()
          .then(async (signedInUser) => {
            setUser(signedInUser);
            registerDeviceInBackground(signedInUser);
            await verifyEligibility(resolveStaffId(signedInUser));
          })
          .finally(() => {
            setLoading(false);
            signInPromiseRef.current = null;
          });

        return signInPromiseRef.current;
      },
      signOut: async () => {
        await authService.logout();
        setUser(null);
        // Abandon any check still in flight, so its late reply cannot stamp a
        // verdict onto the signed-out state.
        eligibilityRunRef.current += 1;
        setEligibility('unknown');
      },
    }),
    [loading, initializing, effectiveUser, eligibility, isLecturer, stampRole, isCompOtEligible, verifyEligibility],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}

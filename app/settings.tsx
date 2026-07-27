import Constants from 'expo-constants';
import { Bell, ChevronRight, KeyRound, ScanFace, Moon, SunMoon } from 'lucide-react-native';
import { Alert, AppState, Linking, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type React from 'react';

import { NavTopBar } from '@/components/nav-top-bar';
import { Button } from '@/components/ui/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppFonts } from '@/constants/fonts';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import {
  checkNotificationPermission,
  getNotificationEnabled,
  requestNotificationPermission,
  setNotificationEnabled,
} from '@/services/notificationService';
import { registerLoggedInDevice } from '@/services/deviceService';
import {
  getPasswordUnlockEnabled,
  hasAppPassword,
  setPasswordUnlockEnabled,
} from '@/services/appPasswordService';
import {
  authenticateWithBiometrics,
  getBiometricEnabled,
  getBiometricSupport,
  setBiometricEnabled,
  type BiometricSupport,
} from '@/services/biometricService';
import { TEXT } from '@/constants/text';
import { useCallback, useEffect, useRef, useState } from 'react';

// Resolved from package.json by app.config.js, so bumping the package version is
// all it takes to update what this screen shows.
const APP_VERSION = Constants.expoConfig?.version ?? '—';

const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  notifications: Bell,
  fingerprint: ScanFace,
  password: KeyRound,
  'dark-mode': Moon,
  'auto-theme': SunMoon,
};

/** Neutral grey tile behind a settings row's glyph, matching the absence menu. */
function IconCircle({ name }: { name: string }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const Icon = ICON_MAP[name];
  return (
    <View style={styles.iconCircle}>
      {Icon ? <Icon size={18} color={c.text} /> : null}
    </View>
  );
}

export default function SettingsScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { user: authUser, signOut } = useAuth();
  const { isDarkMode, toggleDarkMode, isAutoTheme, toggleAutoTheme } = useTheme();

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  // Tracks the last synced value so registration only fires on the off→on edge.
  const wasNotificationsEnabledRef = useRef(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [biometricSupport, setBiometricSupport] = useState<BiometricSupport | null>(null);
  const [biometricLoading, setBiometricLoading] = useState(true);
  const [passwordEnabled, setPasswordEnabledState] = useState(false);
  const [passwordExists, setPasswordExists] = useState(false);

  // The OS permission is the real switch — ours only narrows it. Re-read both
  // whenever the user could have changed the OS setting behind our back.
  const syncNotificationState = useCallback(async () => {
    try {
      const [hasPermission, prefEnabled] = await Promise.all([
        checkNotificationPermission(),
        getNotificationEnabled(),
      ]);
      const enabled = hasPermission && prefEnabled;
      setNotificationsEnabled(enabled);
      // Permission granted over in the OS Settings app still leaves the device
      // unregistered — the in-app toggle is not the only way notifications
      // can come on.
      if (enabled && !wasNotificationsEnabledRef.current && authUser) {
        void registerLoggedInDevice(authUser).catch(() => null);
      }
      wasNotificationsEnabledRef.current = enabled;
    } finally {
      setNotificationsLoading(false);
    }
  }, [authUser]);

  // Coming back from the OS Settings app is the case that matters: the trip out
  // backgrounds us, so 'active' is when the permission may have just changed.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') void syncNotificationState();
    });
    return () => subscription.remove();
  }, [syncNotificationState]);

  // Covers mount and any return to this screen from elsewhere in the app —
  // including coming back from the create-password screen, which is why the
  // password state is re-read here rather than only on mount.
  useFocusEffect(
    useCallback(() => {
      void syncNotificationState();
      void Promise.all([getPasswordUnlockEnabled(), hasAppPassword()]).then(
        ([enabled, exists]) => {
          setPasswordExists(exists);
          // A preference with no password behind it protects nothing.
          setPasswordEnabledState(enabled && exists);
        },
      );
    }, [syncNotificationState]),
  );

  useEffect(() => {
    void Promise.all([getBiometricSupport(), getBiometricEnabled()])
      .then(([support, enabled]) => {
        setBiometricSupport(support);
        // A device that lost its enrolment silently disables the lock, so the
        // switch never claims a protection that is not actually in force.
        setBiometricEnabledState(enabled && support.usable);
      })
      .finally(() => setBiometricLoading(false));
  }, []);

  async function handleBiometricToggle(next: boolean) {
    if (!next) {
      await setBiometricEnabled(false);
      setBiometricEnabledState(false);
      return;
    }

    const support = biometricSupport ?? (await getBiometricSupport());
    setBiometricSupport(support);

    if (!support.hasHardware) {
      Alert.alert(TEXT.BIOMETRIC_UNAVAILABLE_TITLE, TEXT.BIOMETRIC_NO_HARDWARE_MESSAGE);
      return;
    }
    if (!support.isEnrolled) {
      Alert.alert(TEXT.BIOMETRIC_UNAVAILABLE_TITLE, TEXT.BIOMETRIC_NOT_ENROLLED_MESSAGE, [
        { text: TEXT.CANCEL, style: 'cancel' },
        { text: TEXT.SETTINGS_OPEN_OS_SETTINGS, onPress: () => Linking.openSettings() },
      ]);
      return;
    }

    // Prove the *scan* works before promising it at the next launch — a device
    // passcode here would enable a lock the user may not be able to open.
    const { success } = await authenticateWithBiometrics(
      TEXT.BIOMETRIC_ENABLE_PROMPT,
      TEXT.BIOMETRIC_LOCK_CANCEL,
    );
    if (!success) return;

    await setBiometricEnabled(true);
    setBiometricEnabledState(true);
  }

  async function handlePasswordToggle(next: boolean) {
    if (!next) {
      await setPasswordUnlockEnabled(false);
      setPasswordEnabledState(false);
      return;
    }

    // Nothing to switch on until a password exists — send them to create one,
    // and let that screen flip the option once it saves.
    if (!passwordExists) {
      router.push('/create-password?enable=1');
      return;
    }

    await setPasswordUnlockEnabled(true);
    setPasswordEnabledState(true);
  }

  async function handleNotificationsToggle(next: boolean) {
    if (next) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          TEXT.SETTINGS_PERMISSION_REQUIRED_TITLE,
          TEXT.SETTINGS_NOTIFICATIONS_BLOCKED_MESSAGE,
          [
            { text: TEXT.CANCEL, style: 'cancel' },
            {
              text: TEXT.SETTINGS_OPEN_OS_SETTINGS,
              // Remember the intent, so granting permission over in the OS
              // Settings app leaves the switch on when we sync on return.
              onPress: () => {
                void setNotificationEnabled(true);
                void Linking.openSettings();
              },
            },
          ],
        );
        return;
      }
      await setNotificationEnabled(true);
      setNotificationsEnabled(true);
      if (authUser) void registerLoggedInDevice(authUser).catch(() => null);
    } else {
      await setNotificationEnabled(false);
      setNotificationsEnabled(false);
      Alert.alert(
        TEXT.SETTINGS_NOTIFICATIONS_DISABLED_TITLE,
        TEXT.SETTINGS_NOTIFICATIONS_DISABLED_MESSAGE,
        [
          { text: TEXT.SHARED_OK, style: 'cancel' },
          { text: TEXT.SETTINGS_OPEN_OS_SETTINGS, onPress: () => Linking.openSettings() },
        ],
      );
    }
  }

  function handleLogout() {
    Alert.alert(
      TEXT.SETTINGS_LOGOUT,
      TEXT.SETTINGS_LOGOUT_CONFIRM,
      [
        { text: TEXT.CANCEL, style: 'cancel' },
        { text: TEXT.SETTINGS_LOGOUT, style: 'destructive', onPress: () => signOut() },
      ],
    );
  }

  return (
    <ThemedView style={styles.container} lightColor={c.background} darkColor={c.background}>
      <StatusBar style="light" />
      <NavTopBar title={TEXT.SETTINGS_TITLE} tone="primary" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <ThemedText style={styles.sectionTitle}>{TEXT.SETTINGS_PREFERENCES}</ThemedText>
            </View>
            <View style={styles.row}>
              <IconCircle name="notifications" />
              <View style={styles.rowBody}>
                <ThemedText style={styles.rowTitle}>{TEXT.SETTINGS_NOTIFICATIONS_TITLE}</ThemedText>
                <ThemedText style={styles.rowSub}>{TEXT.SETTINGS_NOTIFICATIONS_SUB}</ThemedText>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleNotificationsToggle}
                disabled={notificationsLoading}
                trackColor={{ false: c.borderStrong, true: c.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* ── App lock: the password here is deliberately not the device's ──── */}
        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <ThemedText style={styles.sectionTitle}>{TEXT.SETTINGS_PASSWORD_SECTION}</ThemedText>
            </View>

            <View style={[styles.row, styles.rowDivider]}>
              <IconCircle name="password" />
              <View style={styles.rowBody}>
                <ThemedText style={styles.rowTitle}>
                  {TEXT.SETTINGS_PASSWORD_UNLOCK_TITLE}
                </ThemedText>
                <ThemedText style={styles.rowSub}>{TEXT.SETTINGS_PASSWORD_UNLOCK_SUB}</ThemedText>
              </View>
              <Switch
                value={passwordEnabled}
                onValueChange={handlePasswordToggle}
                trackColor={{ false: c.borderStrong, true: c.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.row, passwordExists ? styles.rowDivider : null]}>
              <IconCircle name="fingerprint" />
              <View style={styles.rowBody}>
                <ThemedText style={styles.rowTitle}>{TEXT.SETTINGS_BIOMETRIC_TITLE}</ThemedText>
                <ThemedText style={styles.rowSub}>
                  {biometricSupport && !biometricSupport.usable
                    ? TEXT.BIOMETRIC_NO_HARDWARE_MESSAGE
                    : biometricSupport?.label
                      ? `${TEXT.SETTINGS_BIOMETRIC_SUB_PREFIX}${biometricSupport.label}`
                      : TEXT.SETTINGS_BIOMETRIC_SUB}
                </ThemedText>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                disabled={biometricLoading || !biometricSupport?.usable}
                trackColor={{ false: c.borderStrong, true: c.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            {passwordExists ? (
              <Pressable
                accessibilityRole="button"
                style={styles.row}
                onPress={() => router.push('/create-password')}
              >
                <IconCircle name="password" />
                <View style={styles.rowBody}>
                  <ThemedText style={styles.rowTitle}>
                    {TEXT.SETTINGS_PASSWORD_CHANGE_TITLE}
                  </ThemedText>
                  <ThemedText style={styles.rowSub}>
                    {TEXT.SETTINGS_PASSWORD_CHANGE_SUB}
                  </ThemedText>
                </View>
                <ChevronRight size={18} color={c.textFaint} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* ── Appearance / Theme control ─────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <ThemedText style={styles.sectionTitle}>{TEXT.SETTINGS_APPEARANCE}</ThemedText>
              <ThemedText style={styles.sectionCaption}>
                {isAutoTheme
                  ? TEXT.SETTINGS_THEME_AUTO_CAPTION
                  : isDarkMode
                    ? TEXT.SETTINGS_THEME_DARK_CAPTION
                    : TEXT.SETTINGS_THEME_LIGHT_CAPTION}
              </ThemedText>
            </View>
            <View style={[styles.row, styles.rowDivider]}>
              <IconCircle name="dark-mode" />
              <View style={styles.rowBody}>
                <ThemedText style={styles.rowTitle}>{TEXT.SETTINGS_DARK_TITLE}</ThemedText>
                <ThemedText style={styles.rowSub}>
                  {isAutoTheme ? TEXT.SETTINGS_DARK_SUB_AUTO : TEXT.SETTINGS_DARK_SUB}
                </ThemedText>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={toggleDarkMode}
                trackColor={{ false: c.borderStrong, true: c.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.row}>
              <IconCircle name="auto-theme" />
              <View style={styles.rowBody}>
                <ThemedText style={styles.rowTitle}>{TEXT.SETTINGS_AUTO_THEME_TITLE}</ThemedText>
                <ThemedText style={styles.rowSub}>{TEXT.SETTINGS_AUTO_THEME_SUB}</ThemedText>
              </View>
              <Switch
                value={isAutoTheme}
                onValueChange={toggleAutoTheme}
                trackColor={{ false: c.borderStrong, true: c.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Button
            title={TEXT.SETTINGS_LOGOUT}
            variant="danger"
            size="lg"
            icon="logout"
            fullWidth
            onPress={handleLogout}
          />
          <ThemedText style={styles.versionText}>
            {`${TEXT.SETTINGS_APP_VERSION} ${APP_VERSION}`}
          </ThemedText>
        </View>

      </ScrollView>
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 48, gap: 24 },

  section: { gap: 10 },
  // Header lives inside the card, like SectionCard elsewhere in the app. It
  // carries its own padding because the rows below run edge to edge so their
  // dividers span the full width.
  cardHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 2,
  },
  sectionTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: AppFonts.psuBold,
    color: c.text,
  },
  sectionCaption: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: AppFonts.psuRegular,
    color: c.textMuted,
  },

  card: {
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: AppFonts.psuBold,
    color: c.text,
  },
  rowSub: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: AppFonts.psuRegular,
    color: c.textMuted,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  versionText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: AppFonts.psuRegular,
    color: c.textFaint,
    textAlign: 'center',
    marginTop: 4,
  },
});

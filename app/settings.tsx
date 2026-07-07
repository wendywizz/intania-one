import { Bell, ScanFace, LogOut, Moon, SunMoon } from 'lucide-react-native';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type React from 'react';

import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppFonts } from '@/constants/fonts';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import {
  checkNotificationPermission,
  getNotificationEnabled,
  requestNotificationPermission,
  setNotificationEnabled,
} from '@/services/notificationService';
import { registerLoggedInDevice } from '@/services/deviceService';
import { useEffect, useState } from 'react';

const D = {
  bg: '#F5F6FA',
  surface: '#FFFFFF',
  text: '#191C1F',
  mutedText: '#6B7280',
  border: '#E5E7EB',
  primary: '#B33939',
  iconBgBell: '#EDE9FE',
  iconColorBell: '#7C3AED',
  iconBgBio: '#FFF7ED',
  iconColorBio: '#EA580C',
  iconBgDark: '#F1F5F9',
  iconColorDark: '#475569',
  iconBgAuto: '#EFF6FF',
  iconColorAuto: '#2563EB',
} as const;

const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  notifications: Bell,
  fingerprint: ScanFace,
  'dark-mode': Moon,
  'auto-theme': SunMoon,
};

function IconCircle({ bg, color, name }: { bg: string; color: string; name: string }) {
  const Icon = ICON_MAP[name];
  return (
    <View style={[styles.iconCircle, { backgroundColor: bg }]}>
      {Icon ? <Icon size={18} color={color} /> : null}
    </View>
  );
}

export default function SettingsScreen() {
  const { user: authUser, signOut } = useAuth();
  const { isDarkMode, toggleDarkMode, isAutoTheme, toggleAutoTheme } = useTheme();

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(true);

  useEffect(() => {
    void Promise.all([checkNotificationPermission(), getNotificationEnabled()])
      .then(([hasPermission, prefEnabled]) => {
        setNotificationsEnabled(hasPermission && prefEnabled);
      })
      .finally(() => setNotificationsLoading(false));
  }, []);

  async function handleNotificationsToggle(next: boolean) {
    if (next) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Notifications are blocked. Please enable them in your device Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
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
        'Notifications Disabled',
        'To fully stop notifications, also disable them in your device Settings.',
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
    }
  }

  function handleLogout() {
    Alert.alert(
      'ออกจากระบบ',
      'ต้องการออกจากระบบใช่หรือไม่?',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        { text: 'ออกจากระบบ', style: 'destructive', onPress: () => signOut() },
      ],
    );
  }

  return (
    <ThemedView style={styles.container} lightColor={D.bg}>
      <StatusBar style="light" />
      <NavTopBar title="Settings" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Preferences</ThemedText>
          <View style={styles.card}>
            <View style={[styles.row, styles.rowDivider]}>
              <IconCircle bg={D.iconBgBell} color={D.iconColorBell} name="notifications" />
              <View style={styles.rowBody}>
                <ThemedText style={styles.rowTitle}>Push Notifications</ThemedText>
                <ThemedText style={styles.rowSub}>Leave updates and reminders</ThemedText>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleNotificationsToggle}
                disabled={notificationsLoading}
                trackColor={{ false: '#E1E2E6', true: D.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.row, styles.rowDivider]}>
              <IconCircle bg={D.iconBgBio} color={D.iconColorBio} name="fingerprint" />
              <View style={styles.rowBody}>
                <ThemedText style={styles.rowTitle}>Biometric Login</ThemedText>
                <ThemedText style={styles.rowSub}>FaceID or Fingerprint</ThemedText>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={setBiometricEnabled}
                trackColor={{ false: '#E1E2E6', true: D.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.row, styles.rowDivider]}>
              <IconCircle bg={D.iconBgDark} color={D.iconColorDark} name="dark-mode" />
              <View style={styles.rowBody}>
                <ThemedText style={styles.rowTitle}>Dark Appearance</ThemedText>
                <ThemedText style={styles.rowSub}>
                  {isAutoTheme ? 'Controlled by Auto Theme' : 'Switch to low-light theme'}
                </ThemedText>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={toggleDarkMode}
                disabled={isAutoTheme}
                trackColor={{ false: '#E1E2E6', true: D.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.row}>
              <IconCircle bg={D.iconBgAuto} color={D.iconColorAuto} name="auto-theme" />
              <View style={styles.rowBody}>
                <ThemedText style={styles.rowTitle}>Auto Theme</ThemedText>
                <ThemedText style={styles.rowSub}>Match light or dark to the time of day</ThemedText>
              </View>
              <Switch
                value={isAutoTheme}
                onValueChange={toggleAutoTheme}
                trackColor={{ false: '#E1E2E6', true: D.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Pressable
            style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]}
            onPress={handleLogout}
            accessibilityRole="button"
          >
            <LogOut size={20} color={D.primary} />
            <ThemedText style={styles.logoutText}>ออกจากระบบ</ThemedText>
          </Pressable>
          <ThemedText style={styles.versionText}>App Version 2.4.0 (Build 892)</ThemedText>
        </View>

      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 48, gap: 24 },

  section: { gap: 10 },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: AppFonts.psuBold,
    color: '#191C1F',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: '#000',
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
    borderBottomColor: '#F3F4F6',
  },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: AppFonts.psuBold,
    color: '#191C1F',
  },
  rowSub: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: AppFonts.psuRegular,
    color: '#6B7280',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  logoutBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  logoutBtnPressed: { backgroundColor: '#FFF5F5' },
  logoutText: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: AppFonts.psuBold,
    color: '#B33939',
  },
  versionText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: AppFonts.psuRegular,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
  },
});

import MaterialIcons from '@react-native-vector-icons/material-icons';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { LoadingAnimate } from '@/components/loading-animate';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppFonts } from '@/constants/fonts';
import { ENDPOINTS } from '@/constants/endpoints';
import { TEXT } from '@/constants/text';
import { useAuth } from '@/context/AuthContext';
import type { Person } from '@/models/types';
import { getPersonnelSuggestions } from '@/services/personService';

function str(v: unknown): string {
  return typeof v === 'string' && v.trim() ? v.trim() : '';
}

function getFullName(person: Person): string {
  const r = person as Record<string, unknown>;
  const thParts = [str(r.P_NAME_TH), str(r.FNAME_TH), str(r.SNAME_TH)].filter(Boolean);
  if (thParts.length) return thParts.join(' ');
  const enParts = [str(r.P_SNAME_ENG), str(r.FNAME_ENG), str(r.SNAME_ENG)].filter(Boolean);
  return enParts.join(' ') || str(r.name) || str(r.fullName) || str(person.staffId) || '—';
}

function getDepartment(person: Person): string {
  const r = person as Record<string, unknown>;
  return str(r.DEPT_NAME_TH) || str(r.department) || str(r.deptName) || str(r.faculty) || '';
}

function getPosition(person: Person): string {
  const r = person as Record<string, unknown>;
  return str(r.POSITION_NAME_TH) || str(r.POSITION_NAME_ENG) || str(r.positionName) || '';
}

function getPhone(person: Person): string {
  const r = person as Record<string, unknown>;
  return str(r.OFFICE_TEL) || str(r.officeTel) || str(r.phone) || str(r.tel) || '';
}

function getEmail(person: Person): string {
  const r = person as Record<string, unknown>;
  return str(r.EMAIL) || str(r.email) || '';
}

function getPersonPhoto(person: Person): string {
  const photo = (person as Record<string, unknown>).photo;
  if (typeof photo === 'string' && photo.trim()) {
    const value = photo.trim();
    if (/^(data:|https?:\/\/|file:|content:)/i.test(value)) return value;
    return `data:image/jpeg;base64,${value}`;
  }
  return '';
}

export default function MyProfileScreen() {
  const { user: authUser, signOut } = useAuth();
  const staffId = String(authUser?.staffId || '').trim();

  const [person, setPerson] = useState<Person | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  const photoUrl = staffId
    ? `${ENDPOINTS.photoBase}${encodeURIComponent(staffId)}.jpg`
    : null;

  useEffect(() => {
    if (!staffId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    getPersonnelSuggestions(staffId)
      .then((results) => {
        const match =
          results.find((p) => String(p.staffId) === staffId) ||
          results[0] ||
          null;
        setPerson(match);
      })
      .catch(() => setPerson(null))
      .finally(() => setIsLoading(false));
  }, [staffId]);

  function handleLogout() {
    Alert.alert(
      TEXT.HOME_CONFIRM_LOGOUT_TITLE,
      TEXT.HOME_CONFIRM_LOGOUT_MESSAGE,
      [
        { text: TEXT.CANCEL, style: 'cancel' },
        { text: TEXT.HOME_LOGOUT, style: 'destructive', onPress: () => signOut() },
      ],
    );
  }

  const personPhotoUri = person ? getPersonPhoto(person) : '';
  const displayPhotoUri = personPhotoUri || photoUrl || '';
  const name = person ? getFullName(person) : (authUser?.name || '—');
  const position = person ? getPosition(person) : '';
  const department = person ? getDepartment(person) : '';
  const phone = person ? getPhone(person) : '';
  const email = person ? getEmail(person) : (authUser?.email ? String(authUser.email) : '');

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="light" />
      <NavTopBar title="ข้อมูลส่วนตัว" showHomeButton />

      {isLoading ? (
        <LoadingAnimate title={TEXT.SHARED_LOADING_DATA_TITLE} desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Hero Section */}
          <View style={styles.heroCard}>
            <View style={styles.avatarRing}>
              {displayPhotoUri && !photoFailed ? (
                <Image
                  source={{ uri: displayPhotoUri }}
                  style={styles.avatar}
                  contentFit="cover"
                  transition={200}
                  onError={() => setPhotoFailed(true)}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <MaterialIcons name="person" size={48} color="#FFFFFF" />
                </View>
              )}
            </View>
            <ThemedText style={styles.heroName}>{name}</ThemedText>
            {position ? <ThemedText style={styles.heroPosition}>{position}</ThemedText> : null}
          </View>

          {/* Personal Information Section */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>ข้อมูลส่วนตัว</ThemedText>

            {department ? (
              <View style={styles.infoCard}>
                <View style={styles.infoIconWrap}>
                  <MaterialIcons name="business" size={18} color="#FFFFFF" />
                </View>
                <View style={styles.infoBody}>
                  <ThemedText style={styles.infoLabel}>ภาควิชา / หน่วยงาน</ThemedText>
                  <ThemedText style={styles.infoValue}>{department}</ThemedText>
                </View>
              </View>
            ) : null}

            {phone ? (
              <View style={styles.infoCard}>
                <View style={styles.infoIconWrap}>
                  <MaterialIcons name="phone" size={18} color="#FFFFFF" />
                </View>
                <View style={styles.infoBody}>
                  <ThemedText style={styles.infoLabel}>โทรศัพท์</ThemedText>
                  <ThemedText style={styles.infoValue}>{phone}</ThemedText>
                </View>
                <Pressable
                  onPress={() => Linking.openURL(`tel:${phone}`)}
                  style={styles.actionBtn}
                  accessibilityRole="button"
                  accessibilityLabel="โทร"
                >
                  <MaterialIcons name="call" size={18} color="#585E6D" />
                </Pressable>
              </View>
            ) : null}

            {email ? (
              <View style={styles.infoCard}>
                <View style={styles.infoIconWrap}>
                  <MaterialIcons name="email" size={18} color="#FFFFFF" />
                </View>
                <View style={styles.infoBody}>
                  <ThemedText style={styles.infoLabel}>อีเมล</ThemedText>
                  <ThemedText style={styles.infoValue} numberOfLines={1}>{email}</ThemedText>
                </View>
                <Pressable
                  onPress={() => Linking.openURL(`mailto:${email}`)}
                  style={styles.actionBtn}
                  accessibilityRole="button"
                  accessibilityLabel="ส่งอีเมล"
                >
                  <MaterialIcons name="open-in-new" size={18} color="#585E6D" />
                </Pressable>
              </View>
            ) : null}

            {!department && !phone && !email ? (
              <View style={styles.emptyCard}>
                <ThemedText style={styles.emptyText}>{TEXT.SHARED_EMPTY_DATA}</ThemedText>
              </View>
            ) : null}
          </View>

          {/* App Settings Section */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>ตั้งค่าแอป</ThemedText>
            <View style={styles.settingsCard}>
              <View style={[styles.toggleRow, styles.toggleDivider]}>
                <MaterialIcons name="notifications" size={20} color="#585E6D" style={styles.toggleIcon} />
                <View style={styles.toggleBody}>
                  <ThemedText style={styles.toggleTitle}>การแจ้งเตือน</ThemedText>
                  <ThemedText style={styles.toggleSubtitle}>การอัปเดตการลาและการแจ้งเตือน</ThemedText>
                </View>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: '#E1E2E6', true: '#B33939' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={[styles.toggleRow, styles.toggleDivider]}>
                <MaterialIcons name="fingerprint" size={20} color="#585E6D" style={styles.toggleIcon} />
                <View style={styles.toggleBody}>
                  <ThemedText style={styles.toggleTitle}>เข้าสู่ระบบด้วยชีวมิติ</ThemedText>
                  <ThemedText style={styles.toggleSubtitle}>FaceID หรือ ลายนิ้วมือ</ThemedText>
                </View>
                <Switch
                  value={biometricEnabled}
                  onValueChange={setBiometricEnabled}
                  trackColor={{ false: '#E1E2E6', true: '#B33939' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.toggleRow}>
                <MaterialIcons name="dark-mode" size={20} color="#585E6D" style={styles.toggleIcon} />
                <View style={styles.toggleBody}>
                  <ThemedText style={styles.toggleTitle}>โหมดมืด</ThemedText>
                  <ThemedText style={styles.toggleSubtitle}>เปลี่ยนเป็นธีมแสงน้อย</ThemedText>
                </View>
                <Switch
                  value={darkModeEnabled}
                  onValueChange={setDarkModeEnabled}
                  trackColor={{ false: '#E1E2E6', true: '#B33939' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          </View>

          {/* Logout Section */}
          <View style={styles.section}>
            <Pressable
              style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}
              onPress={handleLogout}
              accessibilityRole="button"
            >
              <MaterialIcons name="logout" size={20} color="#B33939" />
              <ThemedText style={styles.logoutText}>{TEXT.HOME_LOGOUT}</ThemedText>
            </Pressable>
            <ThemedText style={styles.versionText}>App Version 1.0.0</ThemedText>
          </View>

        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FD' },
  content: { padding: 16, paddingBottom: 48, gap: 16 },

  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1E2E6',
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarRing: {
    borderRadius: 999,
    borderWidth: 4,
    borderColor: '#B33939',
    marginBottom: 4,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    backgroundColor: '#DADFF0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroName: {
    fontSize: 20,
    lineHeight: 28,
    fontFamily: AppFonts.psuBold,
    color: '#191C1F',
    textAlign: 'center',
  },
  heroPosition: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: AppFonts.psuRegular,
    color: '#585E6D',
    textAlign: 'center',
  },

  section: { gap: 8 },
  sectionTitle: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: AppFonts.psuBold,
    color: '#191C1F',
    paddingHorizontal: 4,
  },

  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1E2E6',
    borderLeftWidth: 4,
    borderLeftColor: '#B33939',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#B33939',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  infoBody: { flex: 1, gap: 2 },
  infoLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: AppFonts.psuBold,
    color: '#585E6D',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: AppFonts.psuRegular,
    color: '#191C1F',
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F8F9FD',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1E2E6',
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: AppFonts.psuRegular,
    color: '#585E6D',
  },

  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1E2E6',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  toggleDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F1F5',
  },
  toggleIcon: { flexShrink: 0 },
  toggleBody: { flex: 1, gap: 2 },
  toggleTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: AppFonts.psuBold,
    color: '#191C1F',
  },
  toggleSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: AppFonts.psuRegular,
    color: '#585E6D',
  },

  logoutButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1E2E6',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  logoutButtonPressed: {
    backgroundColor: '#FFF5F5',
  },
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
    color: '#8B9099',
    textAlign: 'center',
    marginTop: 2,
  },
});

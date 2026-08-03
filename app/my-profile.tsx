import type React from 'react';
import { Bell, Camera, ChevronRight, Images, Mail, MapPin, Phone, Trash2 } from 'lucide-react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Alert, Animated, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { AppToast } from '@/components/app-toast';
import { LoadingAnimate } from '@/components/loading-animate';
import { ScreenHeader } from '@/components/screen-header';
import { USER_PLACEHOLDER } from '@/constants/images';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppFonts } from '@/constants/fonts';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { ENDPOINTS } from '@/constants/endpoints';
import { TEXT } from '@/constants/text';
import { useAuth } from '@/context/AuthContext';
import type { Person } from '@/models/types';
import { getPersonnelSuggestions, uploadPersonPhoto } from '@/services/personService';
import { getUnreadNotificationCount } from '@/services/notificationService';
import { usePopAnimation } from '@/hooks/use-pop-animation';
import { boxShadow } from '@/constants/shadows';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const D = {
  bg: '#F5F6FA',
  surface: '#FFFFFF',
  text: '#191C1F',
  mutedText: '#6B7280',
  border: '#E5E7EB',
  primary: '#B33939',
  avatarRing: '#FECDD3',
  positionColor: '#D97706',
} as const;

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

const ROW_ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  place: MapPin,
  phone: Phone,
  email: Mail,
};

/** Neutral grey tile behind a row's glyph, matching the settings/absence rows. */
function RowIcon({ name }: { name: string }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const IconComponent = ROW_ICON_MAP[name];
  return (
    <View style={styles.rowIconCircle}>
      {IconComponent ? <IconComponent size={18} color={c.text} /> : null}
    </View>
  );
}

export default function MyProfileScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { user: authUser } = useAuth();
  const staffId = String(authUser?.staffId || '').trim();

  const [person, setPerson] = useState<Person | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [pendingPhotoUri, setPendingPhotoUri] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoToastMessage, setPhotoToastMessage] = useState('');
  const [photoToastType, setPhotoToastType] = useState<'success' | 'error'>('success');
  const photoMenuAnim = usePopAnimation(showPhotoMenu);

  const photoUrl = staffId
    ? `${ENDPOINTS.photoBase}${encodeURIComponent(staffId)}.jpg`
    : null;

  const loadPerson = useCallback(async (isRefresh = false) => {
    if (!staffId) { setIsLoading(false); return; }
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const results = await getPersonnelSuggestions(staffId);
      const match = results.find((p) => String(p.staffId) === staffId) || results[0] || null;
      setPerson(match);
    } catch {
      setPerson(null);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [staffId]);

  useEffect(() => { void loadPerson(); }, [loadPerson]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void getUnreadNotificationCount().then((count) => {
        if (active) setUnreadCount(count);
      });
      return () => { active = false; };
    }, []),
  );

  async function handleTakePhoto() {
    setShowPhotoMenu(false);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(TEXT.PROFILE_PHOTO_PERMISSION_TITLE, TEXT.PROFILE_PHOTO_CAMERA_PERMISSION);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPendingPhotoUri(result.assets[0].uri);
    }
  }

  async function handleChooseFromLibrary() {
    setShowPhotoMenu(false);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(TEXT.PROFILE_PHOTO_PERMISSION_TITLE, TEXT.PROFILE_PHOTO_LIBRARY_PERMISSION);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPendingPhotoUri(result.assets[0].uri);
    }
  }

  async function handleConfirmPhoto() {
    if (!pendingPhotoUri || !staffId) return;
    const uri = pendingPhotoUri;
    setPendingPhotoUri(null);
    setLocalPhotoUri(uri);
    setPhotoFailed(false);
    setIsUploadingPhoto(true);
    try {
      await uploadPersonPhoto(staffId, uri);
      setPhotoToastType('success');
      setPhotoToastMessage(TEXT.PROFILE_PHOTO_UPLOAD_SUCCESS);
    } catch (error) {
      setPhotoToastType('error');
      setPhotoToastMessage(error instanceof Error ? error.message : TEXT.PROFILE_PHOTO_UPLOAD_FAILED);
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  function handleRemovePhoto() {
    setShowPhotoMenu(false);
    setLocalPhotoUri(null);
    setPhotoFailed(true);
  }

  const personPhotoUri = person ? getPersonPhoto(person) : '';
  const displayPhotoUri = localPhotoUri || personPhotoUri || photoUrl || '';
  const name = person ? getFullName(person) : (authUser?.name || '—');
  const position = person ? getPosition(person) : '';
  const department = person ? getDepartment(person) : '';
  const phone = person ? getPhone(person) : '';
  const email = person ? getEmail(person) : (authUser?.email ? String(authUser.email) : '');

  return (
    <ThemedView style={styles.container} lightColor={c.background} darkColor={c.background}>
      <ScreenHeader
        title={TEXT.PROFILE_TITLE}
        backHref="/"
        titleInNavBar
        tone="primary"
        rightContent={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={TEXT.PROFILE_NOTIFICATIONS_A11Y}
            onPress={() => router.push('/notification')}
            style={styles.bellBtn}
          >
            <Bell size={22} color={c.textOnPrimary} />
            {unreadCount > 0 ? <View style={styles.bellBadge} /> : null}
          </Pressable>
        }
      />

      {isLoading ? (
        <LoadingAnimate title={TEXT.SHARED_LOADING_DATA_TITLE} desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadPerson(true)} tintColor={c.primary} />}
        >

          {/* ── Avatar ─────────────────────────────────────────────────────── */}
          <View style={styles.avatarSection}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={TEXT.PROFILE_PHOTO_CHANGE_A11Y}
              onPress={() => setShowPhotoMenu(true)}
              style={styles.avatarPressable}
            >
              <View style={styles.avatarRing}>
                <Image
                  source={
                    displayPhotoUri && !photoFailed
                      ? { uri: displayPhotoUri }
                      : USER_PLACEHOLDER
                  }
                  style={styles.avatar}
                  contentFit="cover"
                  transition={200}
                  onError={() => setPhotoFailed(true)}
                />
              </View>
              <View style={styles.cameraBadge}>
                {isUploadingPhoto
                  ? <ActivityIndicator size="small" color="#FFFFFF" />
                  : <Camera size={14} color="#FFFFFF" />}
              </View>
            </Pressable>
            <ThemedText style={styles.heroName}>{name}</ThemedText>
            {position ? <ThemedText style={styles.heroPosition}>{position}</ThemedText> : null}
            {staffId ? <ThemedText style={styles.heroStaffId}>{TEXT.PROFILE_STAFF_ID_PREFIX}{staffId}</ThemedText> : null}
          </View>

          {/* ── Photo context menu ─────────────────────────────────────────── */}
          <Modal
            transparent
            visible={photoMenuAnim.isMounted}
            animationType="none"
            onRequestClose={() => setShowPhotoMenu(false)}
          >
            <Animated.View style={[styles.menuFill, photoMenuAnim.backdropStyle]}>
              <Pressable style={styles.menuOverlay} onPress={() => setShowPhotoMenu(false)}>
                <AnimatedPressable accessibilityRole="none" onPress={(e) => e.stopPropagation()} style={[styles.menuSheet, photoMenuAnim.panelStyle]}>
                  <View style={styles.menuHandle} />
                  <ThemedText style={styles.menuTitle}>{TEXT.PROFILE_PHOTO_MENU_TITLE}</ThemedText>

                  <Pressable
                    style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                    onPress={handleTakePhoto}
                    accessibilityRole="button"
                  >
                    <View style={styles.menuItemIcon}>
                      <Camera size={20} color={c.primary} />
                    </View>
                    <ThemedText style={styles.menuItemText}>{TEXT.PROFILE_PHOTO_TAKE}</ThemedText>
                  </Pressable>

                  <View style={styles.menuDivider} />

                  <Pressable
                    style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                    onPress={handleChooseFromLibrary}
                    accessibilityRole="button"
                  >
                    <View style={styles.menuItemIcon}>
                      <Images size={20} color={c.primary} />
                    </View>
                    <ThemedText style={styles.menuItemText}>{TEXT.PROFILE_PHOTO_LIBRARY}</ThemedText>
                  </Pressable>

                  {(localPhotoUri || personPhotoUri || photoUrl) ? (
                    <>
                      <View style={styles.menuDivider} />
                      <Pressable
                        style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                        onPress={handleRemovePhoto}
                        accessibilityRole="button"
                      >
                        <View style={styles.menuItemIcon}>
                          <Trash2 size={20} color="#DC2626" />
                        </View>
                        <ThemedText style={[styles.menuItemText, styles.menuItemDestructive]}>{TEXT.PROFILE_PHOTO_REMOVE}</ThemedText>
                      </Pressable>
                    </>
                  ) : null}

                  <Pressable
                    style={({ pressed }) => [styles.menuCancelBtn, pressed && styles.menuItemPressed]}
                    onPress={() => setShowPhotoMenu(false)}
                    accessibilityRole="button"
                  >
                    <ThemedText style={styles.menuCancelText}>{TEXT.CANCEL}</ThemedText>
                  </Pressable>
                </AnimatedPressable>
              </Pressable>
            </Animated.View>
          </Modal>

          {/* ── Photo confirm modal ───────────────────────────────────────── */}
          <Modal
            transparent
            visible={Boolean(pendingPhotoUri)}
            animationType="fade"
            onRequestClose={() => setPendingPhotoUri(null)}
          >
            <View style={styles.confirmPhotoBackdrop}>
              <View style={styles.confirmPhotoSheet}>
                <ThemedText style={styles.confirmPhotoTitle}>{TEXT.PROFILE_PHOTO_CONFIRM_TITLE}</ThemedText>

                <View style={styles.confirmPhotoPreviewRing}>
                  {pendingPhotoUri ? (
                    <Image
                      source={{ uri: pendingPhotoUri }}
                      style={styles.confirmPhotoPreview}
                      contentFit="cover"
                    />
                  ) : null}
                </View>

                <ThemedText style={styles.confirmPhotoSubtitle}>
                  {TEXT.PROFILE_PHOTO_CONFIRM_SUBTITLE}
                </ThemedText>

                <View style={styles.confirmPhotoActions}>
                  <Pressable
                    style={({ pressed }) => [styles.confirmPhotoCancelBtn, pressed && { opacity: 0.7 }]}
                    onPress={() => setPendingPhotoUri(null)}
                    accessibilityRole="button"
                  >
                    <ThemedText style={styles.confirmPhotoCancelText}>{TEXT.CANCEL}</ThemedText>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.confirmPhotoConfirmBtn, pressed && { opacity: 0.85 }]}
                    onPress={handleConfirmPhoto}
                    accessibilityRole="button"
                  >
                    <ThemedText style={styles.confirmPhotoConfirmText}>{TEXT.PROFILE_PHOTO_CONFIRM_ACCEPT}</ThemedText>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>

          {/* ── Personal Information ───────────────────────────────────────── */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>{TEXT.PROFILE_SECTION_INFO}</ThemedText>

            <View style={styles.infoCard}>
              {department ? (
                <View style={styles.infoRow}>
                  <RowIcon name="place" />
                  <View style={styles.infoBody}>
                    <ThemedText style={styles.infoLabel}>{TEXT.PROFILE_FIELD_DEPARTMENT}</ThemedText>
                    <ThemedText style={styles.infoValue}>{department}</ThemedText>
                  </View>
                </View>
              ) : null}

              {phone ? (
                <>
                  {department ? <View style={styles.infoDivider} /> : null}
                  <Pressable
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.infoRow, pressed && styles.infoRowPressed]}
                    onPress={() => router.push({ pathname: '/edit-profile-field', params: { field: 'phone', value: phone, staffId } })}
                  >
                    <RowIcon name="phone" />
                    <View style={styles.infoBody}>
                      <ThemedText style={styles.infoLabel}>{TEXT.PROFILE_FIELD_PHONE}</ThemedText>
                      <ThemedText style={styles.infoValue}>{phone}</ThemedText>
                    </View>
                    <ChevronRight size={20} color={c.textMuted} />
                  </Pressable>
                </>
              ) : null}

              {email ? (
                <>
                  {(department || phone) ? <View style={styles.infoDivider} /> : null}
                  <Pressable
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.infoRow, pressed && styles.infoRowPressed]}
                    onPress={() => router.push({ pathname: '/edit-profile-field', params: { field: 'email', value: email, staffId } })}
                  >
                    <RowIcon name="email" />
                    <View style={styles.infoBody}>
                      <ThemedText style={styles.infoLabel}>{TEXT.PROFILE_FIELD_EMAIL}</ThemedText>
                      <ThemedText style={styles.infoValue} numberOfLines={1}>{email}</ThemedText>
                    </View>
                    <ChevronRight size={20} color={c.textMuted} />
                  </Pressable>
                </>
              ) : null}

              {!department && !phone && !email ? (
                <View style={styles.emptyRow}>
                  <ThemedText style={styles.emptyText}>{TEXT.SHARED_EMPTY_DATA}</ThemedText>
                </View>
              ) : null}
            </View>
          </View>

        </ScrollView>
      )}
      <AppToast message={photoToastMessage} type={photoToastType} />
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 48, gap: 24 },

  bellBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.primary,
    borderWidth: 1.5,
    borderColor: c.navBar,
  },

  // ── Avatar ──────────────────────────────────────────────────────────────────
  avatarSection: {
    alignItems: 'center',
    gap: 6,
    paddingBottom: 4,
  },
  avatarPressable: {
    position: 'relative',
    marginBottom: 10,
  },
  avatarRing: {
    borderRadius: 999,
    borderWidth: 3,
    borderColor: D.avatarRing,
    padding: 3,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: c.textOnPrimary,
  },

  // ── Photo context menu ───────────────────────────────────────────────────────
  menuFill: { flex: 1 },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 12,
  },
  menuHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.borderStrong,
    alignSelf: 'center',
    marginBottom: 16,
  },
  menuTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: AppFonts.psuBold,
    color: c.textFaint,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  menuItemPressed: { opacity: 0.6 },
  menuItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: AppFonts.psuRegular,
    color: c.text,
  },
  menuItemDestructive: { color: c.danger },
  menuDivider: {
    height: 1,
    backgroundColor: c.border,
  },
  menuCancelBtn: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center',
  },
  menuCancelText: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: AppFonts.psuBold,
    color: c.textMuted,
  },
  heroName: {
    fontSize: 20,
    lineHeight: 28,
    fontFamily: AppFonts.psuBold,
    color: c.text,
    textAlign: 'center',
  },
  heroPosition: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: AppFonts.psuRegular,
    color: D.positionColor,
    textAlign: 'center',
  },
  heroStaffId: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: AppFonts.psuRegular,
    color: c.textFaint,
    textAlign: 'center',
  },

  // ── Section ─────────────────────────────────────────────────────────────────
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: AppFonts.psuBold,
    color: c.text,
  },

  // ── Info card ───────────────────────────────────────────────────────────────
  infoCard: {
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
    boxShadow: boxShadow(c.shadow, { y: 1, blur: 6, opacity: 0.04 }),
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
  },
  infoRowPressed: {
    backgroundColor: c.surfaceAlt,
  },
  infoDivider: {
    height: 1,
    backgroundColor: c.border,
    marginHorizontal: 16,
  },
  rowIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  infoBody: { flex: 1, gap: 2 },
  infoLabel: {
    fontSize: 10,
    lineHeight: 14,
    fontFamily: AppFonts.psuBold,
    color: c.textFaint,
    letterSpacing: 0.6,
  },
  infoValue: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: AppFonts.psuRegular,
    color: c.text,
  },
emptyRow: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: AppFonts.psuRegular,
    color: c.textMuted,
  },

  // ── Photo confirm modal ──────────────────────────────────────────────────────
  confirmPhotoBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  confirmPhotoSheet: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: c.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  confirmPhotoTitle: {
    fontSize: 18,
    lineHeight: 26,
    fontFamily: AppFonts.psuBold,
    color: c.text,
  },
  confirmPhotoPreviewRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: D.avatarRing,
    overflow: 'hidden',
  },
  confirmPhotoPreview: {
    width: '100%',
    height: '100%',
  },
  confirmPhotoSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: AppFonts.psuRegular,
    color: c.textMuted,
    textAlign: 'center',
  },
  confirmPhotoActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 4,
  },
  confirmPhotoCancelBtn: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceAlt,
  },
  confirmPhotoCancelText: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: AppFonts.psuBold,
    color: c.textMuted,
  },
  confirmPhotoConfirmBtn: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: c.pomegranate,
  },
  confirmPhotoConfirmText: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: AppFonts.psuBold,
    color: c.textOnPrimary,
  },
});

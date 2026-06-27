import { ConfirmModal } from '@/components/notice-repair/confirm-modal';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { TEXT } from '@/constants/text';
import { PR_ROLE_APPROVE } from '@/constants/types';
import { useAuth } from '@/context/AuthContext';
import type { NoticeRepairDetail } from '@/models/types';
import { approveRepair, cancelRepair, getDetail } from '@/services/noticeRepairService';
import { getPersonPhoto } from '@/services/personService';
import { getCategoryIcon } from '@/utils/category-icon';
import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

// New job awaiting approval — the only status where the approver's
// เห็นชอบ / ไม่เห็นชอบ / ยกเลิก actions are valid (see Repair_Controller).
const STATUS_NEW = '001';

const STATUS_COLORS: Record<string, string> = {
  '001': '#2563EB', '002': '#16A34A', '003': '#D97706',
  '004': '#EA580C', '005': '#EA580C', '006': '#EA580C',
  '007': '#EA580C', '008': '#15803D', '106': '#15803D', '200': '#DC2626',
};
function statusColor(s?: string) {
  if (!s) return '#6B7280';
  if (s.startsWith('1') && s !== '106') return '#B91C1C';
  return STATUS_COLORS[s] ?? '#6B7280';
}

function normalizeStaffId(id: string) {
  return /^\d+$/.test(id) ? id.padStart(7, '0') : id;
}

/** White rounded card with soft shadow (Figma: Section cards, radius 24). */
function Card({ children }: { children: ReactNode }) {
  return (
    <ThemedView style={styles.card} lightColor="#FFFFFF" darkColor="#151718">
      {children}
    </ThemedView>
  );
}

/** Filled key/value tile used for อาคาร / สถานที่ (Figma: #F9FAFB, radius 16). */
function InfoTile({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.infoTile}>
      <ThemedText style={styles.tileLabel}>{label}</ThemedText>
      <ThemedText style={styles.tileValue}>{value}</ThemedText>
    </View>
  );
}

/** Label/value row with a bottom divider (Figma: หน่วยงาน / เบอร์โทรศัพท์). */
function DividerRow({ label, value, valueColor }: { label: string; value?: string | null; valueColor?: string }) {
  if (!value) return null;
  return (
    <View style={styles.dividerRow}>
      <ThemedText style={styles.rowLabel}>{label}</ThemedText>
      <ThemedText style={[styles.rowValue, valueColor ? { color: valueColor } : null]}>{value}</ThemedText>
    </View>
  );
}

function RequesterAvatar({ staffId, name }: { staffId: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const normalized = normalizeStaffId(staffId);
  const showPhoto = Boolean(normalized) && !failed;
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <View style={styles.avatarWrap}>
      {showPhoto ? (
        <Image
          source={{ uri: getPersonPhoto({ staffId: normalized }) }}
          onError={() => setFailed(true)}
          style={styles.avatar}
        />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <ThemedText style={styles.avatarInitial}>{initial}</ThemedText>
        </View>
      )}
    </View>
  );
}

export default function NoticeRepairDetailScreen() {
  const { repair_id, staff_id: paramStaff, role } = useLocalSearchParams<{
    repair_id: string; staff_id: string; role?: string;
  }>();
  const { user } = useAuth();
  const staffId = paramStaff ?? user?.staffId ?? '';

  const [detail, setDetail] = useState<NoticeRepairDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [submitting, setSubmitting] = useState(false);
  // Pending confirm-modal action (เห็นชอบ / ยกเลิก); null when closed.
  const [pending, setPending] = useState<null | {
    title: string;
    message: string;
    confirmLabel: string;
    destructive?: boolean;
    run: () => Promise<unknown>;
  }>(null);

  useEffect(() => {
    if (!repair_id) return;
    setIsLoading(true);
    getDetail(Number(repair_id), staffId)
      .then(setDetail)
      .catch((e) => setError(e instanceof Error ? e.message : 'ไม่สามารถโหลดรายละเอียดได้'))
      .finally(() => setIsLoading(false));
  }, [repair_id, staffId]);

  // Approver ("หัวหน้าสาธารณูปการ") actions are only valid on a new (001) job.
  const canApprove = role === PR_ROLE_APPROVE && detail?.repair_status === STATUS_NEW;

  const onConfirmPending = useCallback(async () => {
    if (!pending || submitting) return;
    setSubmitting(true);
    try {
      await pending.run();
      setPending(null);
      Alert.alert(TEXT.PR_ACTION_SUCCESS, undefined, [
        { text: TEXT.PR_ACTION_CONFIRM, onPress: () => router.back() },
      ]);
    } catch (e) {
      setPending(null);
      Alert.alert(TEXT.PR_ACTION_FAILED, e instanceof Error ? e.message : undefined);
    } finally {
      setSubmitting(false);
    }
  }, [pending, submitting]);

  const onApprove = useCallback(() => {
    setPending({
      title: TEXT.PR_ACTION_AGREE,
      message: TEXT.PR_ACTION_AGREE_CONFIRM,
      confirmLabel: TEXT.PR_ACTION_AGREE,
      run: () => approveRepair(repair_id, staffId),
    });
  }, [repair_id, staffId]);

  const onCancelJob = useCallback(() => {
    setPending({
      title: TEXT.PR_ACTION_CANCEL,
      message: TEXT.PR_ACTION_CANCEL_CONFIRM,
      confirmLabel: TEXT.PR_ACTION_CANCEL,
      destructive: true,
      run: () => cancelRepair(repair_id, staffId),
    });
  }, [repair_id, staffId]);

  const onNotAgree = useCallback(() => {
    router.push({
      pathname: '/notice-repair/not-agree',
      params: { repair_id, staff_id: staffId },
    } as Parameters<typeof router.push>[0]);
  }, [repair_id, staffId]);

  const renderContent = () => {
    if (isLoading) {
      return <ActivityIndicator style={styles.loader} size="large" color="#B33939" />;
    }
    if (error) {
      return (
        <View style={styles.stateContent}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      );
    }
    if (!detail) return null;

    const dateText = detail.repair_inform_date_th ?? detail.repair_inform_date ?? '';
    const status = detail.repair_status;
    const sColor = statusColor(status);
    const informerId = detail.informer?.STAFF_ID
      ?? (detail.repair_inform_staff != null ? String(detail.repair_inform_staff) : '');

    return (
      <ScrollView
        contentContainerStyle={[styles.scroll, canApprove && styles.scrollWithActions]}
        showsVerticalScrollIndicator={false}>

        {/* ── Repair Summary Card ── */}
        <Card>
          <View style={styles.summaryInner}>
            <View style={styles.summaryTop}>
              <View style={styles.summaryTitleBlock}>
                <ThemedText style={styles.summaryTitle}>{TEXT.PR_DETAIL_TITLE}</ThemedText>
                {!!detail.repair_number && (
                  <ThemedText style={styles.requestNo}>เลขที่คำร้อง {detail.repair_number}</ThemedText>
                )}
              </View>
              {!!status && (
                <View style={[styles.statusBadge, { backgroundColor: `${sColor}1A` }]}>
                  <ThemedText style={[styles.statusText, { color: sColor }]} numberOfLines={1}>
                    {detail.repair_status_name ?? status}
                  </ThemedText>
                </View>
              )}
            </View>

            <View style={styles.summaryBody}>
              {!!detail.work_category_name && (
                <View style={styles.kvBlock}>
                  <ThemedText style={styles.kicker}>{TEXT.PR_DETAIL_CATEGORY}</ThemedText>
                  <View style={styles.kickerValueRow}>
                    <View style={styles.kickerIconBox}>
                      <IconSymbol name={getCategoryIcon(detail.work_category_name)} size={20} color="#922124" />
                    </View>
                    <ThemedText style={styles.kickerValue}>{detail.work_category_name}</ThemedText>
                  </View>
                </View>
              )}

              {!!dateText && (
                <View style={styles.dateBox}>
                  <IconSymbol name="calendar" size={20} color="#B33939" />
                  <ThemedText style={styles.dateText}>{dateText}</ThemedText>
                </View>
              )}
            </View>
          </View>
        </Card>

        {/* ── Requester Info Card ── */}
        {(detail.informer_name || informerId) && (
          <Card>
            <View style={styles.cardInner}>
              <ThemedText style={styles.sectionHeading}>ข้อมูลผู้แจ้งซ่อม</ThemedText>

              <View style={styles.profileRow}>
                <RequesterAvatar staffId={informerId} name={detail.informer_name ?? ''} />
                <View style={styles.profileTextBlock}>
                  <ThemedText style={styles.profileName} numberOfLines={2}>
                    {detail.informer_name || '-'}
                  </ThemedText>
                  {!!detail.informer_position && (
                    <ThemedText style={styles.profileRole} numberOfLines={2}>
                      {detail.informer_position}
                    </ThemedText>
                  )}
                </View>
              </View>

              <View>
                <DividerRow label={TEXT.PR_DETAIL_DEPARTMENT} value={detail.repair_inform_dept_name} />
                <DividerRow label="เบอร์โทรศัพท์" value={detail.repair_tel} valueColor="#B33939" />
              </View>
            </View>
          </Card>
        )}

        {/* ── Location & Detail Card ── */}
        <Card>
          <View style={styles.summaryInner}>
            <ThemedText style={styles.sectionHeading}>รายละเอียดสถานที่</ThemedText>

            <View style={styles.tileGroup}>
              <InfoTile label="อาคาร" value={detail.building_name} />
              <InfoTile label="สถานที่ / ห้อง" value={detail.repair_place} />
            </View>

            {!!detail.repair_inform && (
              <View style={styles.damageBlock}>
                <ThemedText style={styles.tileLabel}>รายละเอียดความชำรุด</ThemedText>
                <View style={styles.damageBox}>
                  <ThemedText style={styles.damageText}>{detail.repair_inform}</ThemedText>
                </View>
              </View>
            )}
          </View>
        </Card>
      </ScrollView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <NavTopBar title={TEXT.PUBLIC_REPAIR_TITLE} backHref="/notice-repair" showHomeButton />

      {renderContent()}

      {/* Bottom action bar — approver only, on a new (001) job */}
      {canApprove && (
        <View style={styles.actionBar}>
          <Pressable
            accessibilityRole="button" disabled={submitting} onPress={onApprove}
            style={[styles.actionBtn, styles.approveBtn, styles.approveFlex, submitting && styles.actionBtnDisabled]}>
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <ThemedText style={styles.approveText}>{TEXT.PR_ACTION_AGREE}</ThemedText>}
          </Pressable>
          <Pressable
            accessibilityRole="button" disabled={submitting} onPress={onNotAgree}
            style={[styles.actionBtn, styles.rejectBtn, styles.quarterFlex, submitting && styles.actionBtnDisabled]}>
            <ThemedText style={styles.rejectText} numberOfLines={1}>{TEXT.PR_ACTION_NOT_AGREE}</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button" disabled={submitting} onPress={onCancelJob}
            style={[styles.actionBtn, styles.cancelBtn, styles.quarterFlex, submitting && styles.actionBtnDisabled]}>
            <ThemedText style={styles.cancelText} numberOfLines={1}>{TEXT.PR_ACTION_CANCEL}</ThemedText>
          </Pressable>
        </View>
      )}

      <ConfirmModal
        visible={pending !== null}
        title={pending?.title ?? ''}
        message={pending?.message}
        confirmLabel={pending?.confirmLabel}
        destructive={pending?.destructive}
        loading={submitting}
        onConfirm={onConfirmPending}
        onCancel={() => { if (!submitting) setPending(null); }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  loader: { flex: 1 },
  stateContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: '#ba1a1a', fontSize: 14, lineHeight: 20, textAlign: 'center' },

  scroll: { padding: 20, gap: 24 },
  scrollWithActions: { paddingBottom: 128 },

  card: {
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardInner: { padding: 20, gap: 16 },
  summaryInner: { padding: 20, gap: 20 },

  // Summary card
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  summaryTitleBlock: { flex: 1, gap: 4 },
  summaryTitle: { fontSize: 20, fontWeight: '700', lineHeight: 26, color: '#111827' },
  requestNo: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
  statusBadge: { borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 6, maxWidth: '42%' },
  statusText: { fontSize: 12, fontWeight: '600', lineHeight: 16 },
  summaryBody: { gap: 16 },
  kvBlock: { gap: 4 },
  kicker: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, color: '#B33939' },
  kickerValueRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  kickerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FBEAEA',
  },
  kickerValue: { flex: 1, fontSize: 18, fontWeight: '600', lineHeight: 26, color: '#111827' },
  dateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dateText: { fontSize: 16, fontWeight: '500', lineHeight: 24, color: '#374151' },

  // Section headings
  sectionHeading: { fontSize: 18, fontWeight: '600', lineHeight: 28, color: '#111827' },

  // Requester card
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  avatarWrap: { width: 64, height: 64 },
  avatar: { width: 64, height: 64, borderRadius: 9999, borderWidth: 2, borderColor: '#FFFFFF', backgroundColor: '#EDEEF2' },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 22, fontWeight: '700', color: '#922124' },
  profileTextBlock: { flex: 1, gap: 3 },
  profileName: { fontSize: 18, fontWeight: '700', lineHeight: 23, color: '#111827' },
  profileRole: { fontSize: 14, color: '#6B7280', lineHeight: 20 },

  dividerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  rowLabel: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
  rowValue: { flex: 1, textAlign: 'right', fontSize: 14, fontWeight: '600', lineHeight: 20, color: '#1F2937' },

  // Location card
  tileGroup: { gap: 16 },
  infoTile: { borderRadius: 16, backgroundColor: '#F9FAFB', padding: 12, gap: 4 },
  tileLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5, color: '#9CA3AF', textTransform: 'uppercase' },
  tileValue: { fontSize: 14, fontWeight: '600', lineHeight: 20, color: '#1F2937' },
  damageBlock: { gap: 8 },
  damageBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  damageText: { fontSize: 16, lineHeight: 26, color: '#374151' },

  // Bottom action bar
  actionBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 18,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  actionBtn: { minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 8 },
  actionBtnDisabled: { opacity: 0.5 },
  approveFlex: { flex: 2 },
  quarterFlex: { flex: 1 },
  approveBtn: {
    backgroundColor: '#B33939',
    shadowColor: '#B33939',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  approveText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  rejectBtn: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FEE2E2' },
  rejectText: { fontSize: 14, fontWeight: '600', color: '#B33939' },
  cancelBtn: { borderWidth: 1, borderColor: '#F3F4F6' },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#374151' },
});

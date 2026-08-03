import { AppToast } from '@/components/app-toast';
import { InfinityLoader } from '@/components/infinity-loader';
import { ModalSelectField, type ModalSelectOption } from '@/components/modal-select-field';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { TEXT } from '@/constants/text';
import { useAuth } from '@/context/AuthContext';
import type { NoticeRepairDetail, NoticeRepairReference } from '@/models/types';
import { getHeaderDetail, getReference } from '@/services/noticeRepairService';
import { USER_PLACEHOLDER } from '@/constants/images';
import { getPersonPhoto } from '@/services/personService';
import { getCategoryIcon } from '@/utils/category-icon';
import { formatDateOnly, formatDateRange } from '@/utils/date-format';
import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { boxShadow } from '@/constants/shadows';

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

/** White rounded card with soft shadow (matches detail.tsx). */
function Card({ children }: { children: ReactNode }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <ThemedView style={styles.card} lightColor="#FFFFFF" darkColor="#151718">
      {children}
    </ThemedView>
  );
}

function InfoTile({ label, value }: { label: string; value?: string | null }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  if (!value) return null;
  return (
    <View style={styles.infoTile}>
      <ThemedText style={styles.tileLabel}>{label}</ThemedText>
      <ThemedText style={styles.tileValue}>{value}</ThemedText>
    </View>
  );
}

function DividerRow({ label, value, valueColor }: { label: string; value?: string | null; valueColor?: string }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  if (!value) return null;
  return (
    <View style={styles.dividerRow}>
      <ThemedText style={styles.rowLabel}>{label}</ThemedText>
      <ThemedText style={[styles.rowValue, valueColor ? { color: valueColor } : null]}>{value}</ThemedText>
    </View>
  );
}

function RequesterAvatar({ staffId, size = 64 }: { staffId: string; size?: number }) {
  const styles = useThemedStyles(makeStyles);
  const [failed, setFailed] = useState(false);
  const normalized = normalizeStaffId(staffId);
  const showPhoto = Boolean(normalized) && !failed;
  const dim = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View style={[styles.avatarWrap, dim]}>
      <Image
        source={showPhoto ? { uri: getPersonPhoto({ staffId: normalized }) } : USER_PLACEHOLDER}
        onError={() => setFailed(true)}
        style={[styles.avatar, dim]}
      />
    </View>
  );
}

function RadioOption({ selected, label, onPress }: { selected: boolean; label: string; onPress: () => void }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress} style={styles.radioOption}>
      <View style={[styles.radioOuter, selected && styles.radioOuterActive]}>
        {selected && <View style={styles.radioInner} />}
      </View>
      <ThemedText style={styles.radioLabel}>{label}</ThemedText>
    </Pressable>
  );
}

export default function HeaderEstimateDetailScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { repair_id, staff_id: paramStaff } = useLocalSearchParams<{
    repair_id: string; staff_id: string; role?: string; source?: string;
  }>();
  const { user } = useAuth();
  const staffId = paramStaff ?? user?.staffId ?? '';

  const [detail, setDetail] = useState<NoticeRepairDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // "สำหรับหัวหน้าหมวด" form state.
  const [changeCategory, setChangeCategory] = useState(false);
  const [categories, setCategories] = useState<ModalSelectOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [assessment, setAssessment] = useState<'y' | 'n' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [successToast, setSuccessToast] = useState('');

  useEffect(() => {
    if (!repair_id) return;
    setIsLoading(true);
    getHeaderDetail(Number(repair_id), staffId)
      .then(setDetail)
      .catch((e) => setError(e instanceof Error ? e.message : TEXT.NOTICE_REPAIR_ERROR_LOAD))
      .finally(() => setIsLoading(false));
  }, [repair_id, staffId]);

  useEffect(() => {
    if (!successToast) return undefined;
    const t = setTimeout(() => setSuccessToast(''), 2500);
    return () => clearTimeout(t);
  }, [successToast]);

  // Fetch the work-category options the first time the user opts to change it.
  useEffect(() => {
    if (!changeCategory || categories.length > 0) return undefined;
    let active = true;
    setCategoriesLoading(true);
    getReference('work_categories')
      .then((list: NoticeRepairReference[]) => {
        if (!active) return;
        setCategories(
          list
            .map((r) => ({ label: String(r.work_category_name ?? ''), value: String(r.work_category_id ?? '') }))
            .filter((o) => o.label && o.value),
        );
      })
      .catch(() => { /* leave empty — picker shows no options */ })
      .finally(() => { if (active) setCategoriesLoading(false); });
    return () => { active = false; };
  }, [changeCategory, categories.length]);

  const handleSave = async () => {
    if (!assessment) {
      setToast('กรุณาเลือกผลการประเมินการซ่อม');
      return;
    }
    setSubmitting(true);
    try {
      // TODO: persist via the header-assessment endpoint once available
      // (work_category change + repair_examine y/n).
      setSuccessToast('บันทึกผลการประเมินสำเร็จ');
      setTimeout(() => { if (router.canGoBack()) router.back(); }, 800);
    } finally {
      setSubmitting(false);
    }
  };

  const renderContent = () => {
    if (isLoading) return <InfinityLoader size={60} style={styles.loader} />;
    if (error) {
      return (
        <View style={styles.stateContent}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      );
    }
    if (!detail) return null;

    const dateRaw = detail.repair_inform_date_th || detail.repair_inform_date;
    const dateText = dateRaw ? formatDateOnly(dateRaw) : '';
    const status = detail.repair_status;
    const sColor = statusColor(status);
    const informerId = detail.informer?.STAFF_ID
      ?? (detail.repair_inform_staff != null ? String(detail.repair_inform_staff) : '');

    // The legacy backend uses '0000-00-00' to mean "no date" — treat as empty.
    const validDate = (d?: string) => (d && !d.startsWith('0000') ? d : '');
    const start = validDate(detail.header?.header_date_start);
    const end = validDate(detail.header?.header_date_end);
    // formatDateRange collapses same-day to one date and same-month to "DD-DD month year".
    const dateRange = start || end ? formatDateRange(start, end) : '';

    const technicians = (detail.technicians ?? []).filter((t) => !!t.name?.trim());

    return (
      <ScrollView contentContainerStyle={[styles.scroll, styles.scrollWithActions]} showsVerticalScrollIndicator={false}>

        {/* ── Repair Summary Card ── */}
        <Card>
          <View style={styles.summaryInner}>
            <View style={styles.summaryTop}>
              <View style={styles.summaryTitleBlock}>
                <ThemedText style={styles.summaryTitle}>{TEXT.NOTICE_REPAIR_DETAIL_TITLE}</ThemedText>
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
                  <ThemedText style={styles.kicker}>{TEXT.NOTICE_REPAIR_DETAIL_CATEGORY}</ThemedText>
                  <View style={styles.kickerValueRow}>
                    <View style={styles.kickerIconBox}>
                      <IconSymbol name={getCategoryIcon(detail.work_category_name)} size={20} color={c.primary} />
                    </View>
                    <ThemedText style={styles.kickerValue}>{detail.work_category_name}</ThemedText>
                  </View>
                </View>
              )}

              {!!dateText && (
                <View style={styles.dateBox}>
                  <IconSymbol name="calendar" size={20} color={c.primary} />
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
                <RequesterAvatar staffId={informerId} />
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
                <DividerRow label={TEXT.NOTICE_REPAIR_DETAIL_DEPARTMENT} value={detail.repair_inform_dept_name} />
                <DividerRow label="ประเภทการซ่อม" value={detail.work_type_name} />
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

            {!!detail.repair_remark && (
              <View style={styles.damageBlock}>
                <ThemedText style={styles.tileLabel}>หมายเหตุ</ThemedText>
                <View style={styles.damageBox}>
                  <ThemedText style={styles.damageText}>{detail.repair_remark}</ThemedText>
                </View>
              </View>
            )}
          </View>
        </Card>

        {/* ── For head of category: assessment form ── */}
        <Card>
          <View style={styles.cardInner}>
            <ThemedText style={styles.sectionHeading}>สำหรับหัวหน้าหมวด</ThemedText>

            <View style={styles.fieldBlock}>
              <ThemedText style={styles.fieldLabel}>วันที่ดำเนินการซ่อม / ดูสถานที่</ThemedText>
              <ThemedText style={styles.fieldValue}>{dateRange || '-'}</ThemedText>
            </View>

            <View style={styles.fieldBlock}>
              <ThemedText style={styles.fieldLabel}>ช่างที่รับผิดชอบ</ThemedText>
              {technicians.length > 0 ? (
                technicians.map((t, i) => (
                  <View key={`${t.staff_id ?? t.name}-${i}`} style={styles.techRow}>
                    <RequesterAvatar staffId={t.staff_id ?? ''} size={40} />
                    <ThemedText style={styles.techName} numberOfLines={2}>{`${i + 1}. ${t.name}`}</ThemedText>
                  </View>
                ))
              ) : (
                <ThemedText style={styles.fieldValue}>-</ThemedText>
              )}
            </View>

            <View style={styles.fieldBlock}>
              <ThemedText style={styles.fieldLabel}>เปลี่ยนแปลงหมวดงานซ่อม</ThemedText>
              <RadioOption selected={changeCategory} label="เปลี่ยนแปลง" onPress={() => setChangeCategory((v) => !v)} />
              {changeCategory && (
                <ModalSelectField
                  title="เลือกหมวดงานซ่อม"
                  placeholder={categoriesLoading ? 'กำลังโหลด...' : 'เลือกหมวดงานซ่อม'}
                  options={categories}
                  value={newCategory}
                  onSelect={setNewCategory}
                />
              )}
            </View>

            <View style={styles.fieldBlock}>
              <ThemedText style={styles.fieldLabel}>ประเมินการซ่อม</ThemedText>
              <View style={styles.radioGroup}>
                <RadioOption selected={assessment === 'y'} label="ซ่อม / ติดตั้งได้" onPress={() => setAssessment('y')} />
                <RadioOption selected={assessment === 'n'} label="ซ่อม / ติดตั้งไม่ได้" onPress={() => setAssessment('n')} />
              </View>
            </View>
          </View>
        </Card>
      </ScrollView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <NavTopBar title={TEXT.NOTICE_REPAIR__TITLE} tone="primary" />

      {renderContent()}

      {!isLoading && !error && (
        <View style={styles.actionBar}>
          <Pressable
            accessibilityRole="button" disabled={submitting} onPress={handleSave}
            style={[styles.actionBtn, styles.approveBtn, styles.approveFlex, submitting && styles.actionBtnDisabled]}>
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <ThemedText style={styles.approveText}>บันทึก</ThemedText>}
          </Pressable>
          <Pressable
            accessibilityRole="button" disabled={submitting} onPress={() => { if (router.canGoBack()) router.back(); }}
            style={[styles.actionBtn, styles.cancelBtn, styles.quarterFlex, submitting && styles.actionBtnDisabled]}>
            <ThemedText style={styles.cancelText} numberOfLines={1}>ยกเลิก</ThemedText>
          </Pressable>
        </View>
      )}

      {!!toast && <AppToast message={toast} type="error" />}
      {!!successToast && (
        <View style={styles.successToast} pointerEvents="none">
          <ThemedText style={styles.successToastText}>{successToast}</ThemedText>
        </View>
      )}
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.surfaceAlt },
  // Centred both ways: ActivityIndicator centred itself inside a flex:1 box,
  // the infinity mark is a plain view and has to be told.
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stateContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: c.primary, fontSize: 14, lineHeight: 20, textAlign: 'center' },

  scroll: { padding: 20, gap: 24 },
  scrollWithActions: { paddingBottom: 128 },

  card: {
    borderRadius: 24,
    boxShadow: boxShadow(c.shadow, { y: 4, blur: 6, opacity: 0.06 }),
  },
  cardInner: { padding: 20, gap: 16 },
  summaryInner: { padding: 20, gap: 20 },

  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  summaryTitleBlock: { flex: 1, gap: 4 },
  summaryTitle: { fontSize: 20, fontWeight: '700', lineHeight: 26, color: c.text },
  requestNo: { fontSize: 14, color: c.textMuted, lineHeight: 20 },
  statusBadge: { borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 6, maxWidth: '42%' },
  statusText: { fontSize: 12, fontWeight: '600', lineHeight: 16 },
  summaryBody: { gap: 16 },
  kvBlock: { gap: 4 },
  kicker: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, color: c.primary },
  kickerValueRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  kickerIconBox: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', backgroundColor: c.primarySoft,
  },
  kickerValue: { flex: 1, fontSize: 18, fontWeight: '600', lineHeight: 26, color: c.text },
  dateBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, borderWidth: 1, borderColor: c.border,
    backgroundColor: c.surfaceAlt, paddingHorizontal: 14, paddingVertical: 14,
  },
  dateText: { fontSize: 16, fontWeight: '500', lineHeight: 24, color: c.textMuted },

  sectionHeading: { fontSize: 18, fontWeight: '600', lineHeight: 28, color: c.text },

  profileRow: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    borderRadius: 16, borderWidth: 1, borderColor: c.border,
    backgroundColor: c.background, padding: 16,
  },
  avatarWrap: { width: 64, height: 64 },
  avatar: { width: 64, height: 64, borderRadius: 9999, borderWidth: 2, borderColor: c.textOnPrimary, backgroundColor: c.border },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 22, fontWeight: '700', color: c.primary },
  profileTextBlock: { flex: 1, gap: 3 },
  profileName: { fontSize: 18, fontWeight: '700', lineHeight: 23, color: c.text },
  profileRole: { fontSize: 14, color: c.textMuted, lineHeight: 20 },

  dividerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12,
    paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  rowLabel: { fontSize: 14, color: c.textMuted, lineHeight: 20 },
  rowValue: { flex: 1, textAlign: 'right', fontSize: 14, fontWeight: '600', lineHeight: 20, color: c.text },

  tileGroup: { gap: 16 },
  infoTile: { borderRadius: 16, backgroundColor: c.surfaceAlt, padding: 12, gap: 4 },
  tileLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5, color: c.textFaint, textTransform: 'uppercase' },
  tileValue: { fontSize: 14, fontWeight: '600', lineHeight: 20, color: c.text },
  damageBlock: { gap: 8 },
  damageBox: {
    borderRadius: 16, borderWidth: 1, borderColor: c.border,
    backgroundColor: c.background, padding: 16,
  },
  damageText: { fontSize: 16, lineHeight: 26, color: c.textMuted },

  // Assessment fields
  fieldBlock: { gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: c.textMuted, lineHeight: 20 },
  fieldValue: { fontSize: 15, color: c.text, lineHeight: 22 },
  techRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  techName: { flex: 1, fontSize: 15, color: c.text, lineHeight: 22 },
  radioGroup: { gap: 12 },
  radioOption: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  radioOuter: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: c.textFaint,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOuterActive: { borderColor: c.primary },
  radioInner: { width: 11, height: 11, borderRadius: 6, backgroundColor: c.primary },
  radioLabel: { fontSize: 15, color: c.text },

  actionBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 18,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopWidth: 1, borderTopColor: c.border,
  },
  actionBtn: { minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 8 },
  actionBtnDisabled: { opacity: 0.5 },
  approveFlex: { flex: 2 },
  quarterFlex: { flex: 1 },
  approveBtn: {
    backgroundColor: c.pomegranate,
    boxShadow: boxShadow(c.primary, { y: 6, blur: 8, opacity: 0.25 }),
  },
  approveText: { fontSize: 14, fontWeight: '700', color: c.textOnPrimary },
  cancelBtn: { borderWidth: 1, borderColor: c.border },
  cancelText: { fontSize: 14, fontWeight: '600', color: c.textMuted },

  successToast: {
    position: 'absolute', left: 16, right: 16, bottom: 88,
    backgroundColor: '#166534', borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center',
    boxShadow: '0 6px 16px rgba(17, 24, 28, 0.18)',
  },
  successToastText: { color: c.textOnPrimary, fontSize: 14, fontWeight: '600', textAlign: 'center' },
});

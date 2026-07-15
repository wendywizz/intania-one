import { ConfirmModal } from '@/components/notice-repair/confirm-modal';
import { MaterialItemCard } from '@/components/notice-repair/material-item-card';
import { NavTopBar } from '@/components/nav-top-bar';
import { useToast } from '@/components/toast-provider';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { TEXT } from '@/constants/text';
import { NOTICE_REPAIR_ROLE_APPROVE, NOTICE_REPAIR_ROLE_ADMIN, NOTICE_REPAIR_ROLE_HEADER, NOTICE_REPAIR_ROLE_INFORMER } from '@/constants/types';
import { useAuth } from '@/context/AuthContext';
import type { NoticeRepairDetail } from '@/models/types';
import { addRequisition, adminAcceptRepair, approveRepair, cancelRepair, getFullDetail } from '@/services/noticeRepairService';
import { getPersonPhoto } from '@/services/personService';
import {
  clearDraftMaterials,
  consumeScrollToMaterials,
  useDraftMaterials,
} from '@/stores/draftMaterials';
import { getCategoryIcon } from '@/utils/category-icon';
import { formatDateOnly, formatDateRange } from '@/utils/date-format';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

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
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <ThemedView style={styles.card} lightColor="#FFFFFF" darkColor="#151718">
      {children}
    </ThemedView>
  );
}

/** Filled key/value tile used for อาคาร / สถานที่ (Figma: #F9FAFB, radius 16). */
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

/** Label/value row with a bottom divider (Figma: หน่วยงาน / เบอร์โทรศัพท์). */
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

function RequesterAvatar({ staffId, name, size = 64 }: { staffId: string; name: string; size?: number }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const [failed, setFailed] = useState(false);
  const normalized = normalizeStaffId(staffId);
  const showPhoto = Boolean(normalized) && !failed;
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  const dim = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View style={[styles.avatarWrap, dim]}>
      {showPhoto ? (
        <Image
          source={{ uri: getPersonPhoto({ staffId: normalized }) }}
          onError={() => setFailed(true)}
          style={[styles.avatar, dim]}
        />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder, dim]}>
          <ThemedText style={[styles.avatarInitial, { fontSize: size * 0.34 }]}>{initial}</ThemedText>
        </View>
      )}
    </View>
  );
}

export default function NoticeRepairDetailScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { repair_id, staff_id: paramStaff, role, source } = useLocalSearchParams<{
    repair_id: string; staff_id: string; role?: string; source?: string;
  }>();
  const { user } = useAuth();
  const { showToast } = useToast();
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

  // Draft (unsaved) materials staged from the add-material screen, kept in a
  // shared client store until the user presses Save here.
  const draftMaterials = useDraftMaterials(repair_id ?? '');
  // Both the Save button and the back button open the same confirm-with-summary
  // modal; 'save-and-leave' additionally navigates back once the save succeeds.
  const [materialConfirm, setMaterialConfirm] = useState<null | 'save' | 'save-and-leave'>(null);
  const [savingMaterials, setSavingMaterials] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const materialSectionRef = useRef<View>(null);
  // Zero-size anchor pinned to the top of the scroll content; measuring the
  // material section against it gives its offset without findNodeHandle (which
  // throws on web).
  const topAnchorRef = useRef<View>(null);

  const draftSummary = useMemo(
    () =>
      draftMaterials
        .map((d, i) => {
          const qty = `${d.number}${d.unit ? ` ${d.unit}` : ''}`;
          const price = d.price ? ` = ${d.price} บาท` : '';
          return `${i + 1}. ${d.name}  (${qty})${price}`;
        })
        .join('\n'),
    [draftMaterials],
  );

  useEffect(() => {
    if (!repair_id) return;
    setIsLoading(true);
    // Use the role-neutral full_detail for everyone — it carries the extra
    // header section (date range, technicians, materials, examine) when present,
    // so the "สำหรับหัวหน้าหมวดงาน" block shows whenever the job has it.
    getFullDetail(Number(repair_id), staffId)
      .then(setDetail)
      .catch((e) => setError(e instanceof Error ? e.message : 'ไม่สามารถโหลดรายละเอียดได้'))
      .finally(() => setIsLoading(false));
  }, [repair_id, staffId]);

  // After returning from add-material, jump (no animation) to the materials
  // section. The add-material screen raised a one-shot signal we consume here.
  useFocusEffect(
    useCallback(() => {
      if (!consumeScrollToMaterials(repair_id ?? '')) return;
      const raf = requestAnimationFrame(() => {
        const section = materialSectionRef.current;
        const anchor = topAnchorRef.current;
        const scroll = scrollRef.current;
        if (!section || !anchor || !scroll) return;
        // measure() (window coords) is supported on web + native, unlike
        // findNodeHandle. The section's offset within the scroll content is its
        // pageY minus the content-top anchor's pageY (both shift with scroll).
        anchor.measure((_ax, _ay, _aw, _ah, _apx, anchorPageY) => {
          section.measure((_sx, _sy, _sw, _sh, _spx, sectionPageY) => {
            const offset = sectionPageY - anchorPageY;
            scroll.scrollTo({ y: Math.max(offset - 16, 0), animated: false });
          });
        });
      });
      return () => cancelAnimationFrame(raf);
    }, [repair_id]),
  );

  // Approver ("หัวหน้าสาธารณูปการ") actions are only valid on a new (001) job.
  const canApprove = role === NOTICE_REPAIR_ROLE_APPROVE && detail?.repair_status === STATUS_NEW;

  // Admin (เจ้าหน้าที่บริหารงาน) รับเรื่อง / ตีกลับ / แก้ไข actions — only when the
  // detail was opened from the admin "รอรับเรื่อง" (admin_pending) list.
  const canAdminReceive = role === NOTICE_REPAIR_ROLE_ADMIN && source === 'admin_pending';

  // Informer may edit their own request while it is still awaiting approval
  // (status 001) — matches the backend, which lets the owner edit a 001 job.
  const canInformerEdit =
    role === NOTICE_REPAIR_ROLE_INFORMER &&
    source === 'informer_current' &&
    detail?.repair_status === STATUS_NEW;

  // Admin supply tabs — offer a link to the full requisition/supply list.
  const canViewSupply = source === 'supply_material' || source === 'dept_supply_response';

  const onConfirmPending = useCallback(async () => {
    if (!pending || submitting) return;
    setSubmitting(true);
    try {
      await pending.run();
      setPending(null);
      showToast(TEXT.NOTICE_REPAIR_ACTION_SUCCESS, 'success');
      router.back();
    } catch (e) {
      setPending(null);
      showToast(e instanceof Error ? e.message : TEXT.NOTICE_REPAIR_ACTION_FAILED, 'error');
    } finally {
      setSubmitting(false);
    }
  }, [pending, submitting, showToast]);

  const onApprove = useCallback(() => {
    setPending({
      title: TEXT.NOTICE_REPAIR_ACTION_AGREE,
      message: TEXT.NOTICE_REPAIR_ACTION_AGREE_CONFIRM,
      confirmLabel: TEXT.NOTICE_REPAIR_ACTION_AGREE,
      run: () => approveRepair(repair_id, staffId),
    });
  }, [repair_id, staffId]);

  const onCancelJob = useCallback(() => {
    setPending({
      title: TEXT.NOTICE_REPAIR_ACTION_CANCEL,
      message: TEXT.NOTICE_REPAIR_ACTION_CANCEL_CONFIRM,
      confirmLabel: TEXT.NOTICE_REPAIR_ACTION_CANCEL,
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

  // ── Admin actions ──
  const onAdminAccept = useCallback(() => {
    setPending({
      title: TEXT.NOTICE_REPAIR_ACTION_ADMIN_ACCEPT,
      message: TEXT.NOTICE_REPAIR_ACTION_ADMIN_ACCEPT_CONFIRM,
      confirmLabel: TEXT.NOTICE_REPAIR_ACTION_ADMIN_ACCEPT,
      run: () => adminAcceptRepair(repair_id, staffId),
    });
  }, [repair_id, staffId]);

  const onAdminReject = useCallback(() => {
    router.push({
      pathname: '/notice-repair/admin-reject',
      params: { repair_id, staff_id: staffId },
    } as Parameters<typeof router.push>[0]);
  }, [repair_id, staffId]);

  const onEdit = useCallback(() => {
    router.push({
      pathname: '/notice-repair/edit',
      params: { repair_id, staff_id: staffId, role, source },
    } as Parameters<typeof router.push>[0]);
  }, [repair_id, staffId, role, source]);

  // Informer removes (cancels) their own pending request. Reuses the pending
  // confirm flow, which on success toasts and pops back to the list.
  const onRemove = useCallback(() => {
    setPending({
      title: TEXT.NOTICE_REPAIR_ACTION_DELETE,
      message: TEXT.NOTICE_REPAIR_ACTION_DELETE_CONFIRM,
      confirmLabel: TEXT.NOTICE_REPAIR_ACTION_DELETE,
      destructive: true,
      run: () => cancelRepair(repair_id, staffId),
    });
  }, [repair_id, staffId]);

  // Navigate back to the correct list based on role and source.
  // NavTopBar.goBack already holds the nav lock when it calls this, so we must
  // not re-acquire it here (that second attempt fails and aborts the nav).
  const doBack = useCallback(() => {
    // Determine which tab/path to go back to based on role and source.
    // Routes must match the real tab screen names (groups stripped).
    if (role === NOTICE_REPAIR_ROLE_HEADER) {
      if (source === 'header_current') {
        router.replace('/notice-repair/header-repair-list');
        return;
      }
      if (source === 'header_pending') {
        router.replace('/notice-repair/header-pending');
        return;
      }
    }

    if (role === NOTICE_REPAIR_ROLE_ADMIN) {
      if (source === 'admin_pending') {
        router.replace('/notice-repair/admin-pending-receipt');
        return;
      }
    }

    if (role === NOTICE_REPAIR_ROLE_APPROVE) {
      if (source === 'approve_pending') {
        router.replace('/notice-repair/approve-pending');
        return;
      }
    }

    // Default fallback - try router.back() or go to home
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, [role, source]);

  // Back button: with unsaved materials, open the same save-confirm modal
  // (which navigates back once the save succeeds).
  const handleBackPress = useCallback(() => {
    if (draftMaterials.length > 0) {
      setMaterialConfirm('save-and-leave');
      return;
    }
    doBack();
  }, [draftMaterials.length, doBack]);

  // Save staged materials to the DB in one batch. When opened from the back
  // button ('save-and-leave') navigate back afterwards; otherwise stay and
  // refresh the detail from the server.
  const onConfirmSaveMaterials = useCallback(async () => {
    if (savingMaterials || draftMaterials.length === 0) return;
    const leaveAfterSave = materialConfirm === 'save-and-leave';
    setSavingMaterials(true);
    try {
      await addRequisition(repair_id, staffId, [...draftMaterials]);
      clearDraftMaterials(repair_id ?? '');
      setMaterialConfirm(null);
      showToast('บันทึกรายการวัสดุเรียบร้อยแล้ว', 'success');
      if (leaveAfterSave) {
        doBack();
        return;
      }
      const fresh = await getFullDetail(Number(repair_id), staffId);
      setDetail(fresh);
    } catch (e) {
      setMaterialConfirm(null);
      showToast(e instanceof Error ? e.message : TEXT.NOTICE_REPAIR_ACTION_FAILED, 'error');
    } finally {
      setSavingMaterials(false);
    }
  }, [savingMaterials, draftMaterials, repair_id, staffId, materialConfirm, doBack, showToast]);

  const renderContent = () => {
    if (isLoading) {
      return <ActivityIndicator style={styles.loader} size="large" color={c.primary} />;
    }
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

    // "สำหรับหัวหน้าหมวดงาน" section (present only on full_detail / header_detail).
    const validDate = (d?: string) => (d && !d.startsWith('0000') ? d : '');
    const opStart = validDate(detail.header?.header_date_start);
    const opEnd = validDate(detail.header?.header_date_end);
    // formatDateRange collapses same-day to one date and same-month to "DD-DD month year".
    const opDateRange = opStart || opEnd ? formatDateRange(opStart, opEnd) : '';
    const technicians = (detail.technicians ?? []).filter((t) => !!t.name?.trim());
    const assessmentText = detail.repair === 'n'
      ? 'ซ่อม / ติดตั้งไม่ได้'
      : detail.repair_estimate === 'y' ? 'ซ่อม / ติดตั้งได้' : '';
    const requisitions = detail.requisitions ?? [];
    const examineCode = detail.examine?.repair_examine ?? detail.repair_examine;
    const examineRemark = detail.examine?.repair_examine_remark ?? detail.repair_examine_remark;
    const examineText = examineCode === 'y'
      ? 'ดำเนินการเสร็จสมบูรณ์'
      : examineCode === 'n' ? `ไม่ผ่าน${examineRemark ? ` - ${examineRemark}` : ''}` : '';

    const hasDrafts = draftMaterials.length > 0;

    return (
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.scroll, (canApprove || canAdminReceive || canInformerEdit || canViewSupply || hasDrafts) && styles.scrollWithActions]}
        showsVerticalScrollIndicator={false}>

        {/* Content-top anchor for scroll-to-materials (zero-size, no layout impact) */}
        <View ref={topAnchorRef} style={styles.scrollTopAnchor} pointerEvents="none" />

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
            <View style={styles.summaryInner}>
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

              <View style={styles.tileGroup}>
                <InfoTile label={TEXT.NOTICE_REPAIR_DETAIL_DEPARTMENT} value={detail.repair_inform_dept_name} />
                <InfoTile label="เบอร์โทรศัพท์" value={detail.repair_tel} />
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

        {/* ── For head of category: assignment / materials / examine ── */}
        {detail.header && (
          <Card>
            <View style={styles.summaryInner}>
              <ThemedText style={styles.sectionHeading}>สำหรับหัวหน้าหมวดงาน</ThemedText>

              <View style={styles.tileGroup}>
                <InfoTile label="วันที่ดำเนินการซ่อม / ดูสถานที่" value={opDateRange} />
                <InfoTile label="ประเมินการซ่อม" value={assessmentText} />
              </View>

              {technicians.length > 0 && (
                <View style={styles.infoTile}>
                  <ThemedText style={styles.tileLabel}>ช่างที่รับผิดชอบ</ThemedText>
                  {technicians.map((t, i) => (
                    <View key={`${t.staff_id ?? t.name}-${i}`} style={[styles.techListItem, i < technicians.length - 1 && styles.techListItemBorder]}>
                      <RequesterAvatar staffId={t.staff_id ?? ''} name={t.name ?? ''} size={40} />
                      <View style={styles.profileTextBlock}>
                        <ThemedText style={styles.techProfileName} numberOfLines={2}>{t.name}</ThemedText>
                        {!!t.staff_type && (
                          <ThemedText style={styles.profileRole} numberOfLines={2}>{t.staff_type}</ThemedText>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <View ref={materialSectionRef} style={styles.infoTile}>
                <View style={styles.matHeader}>
                  <ThemedText style={styles.tileLabel}>รายการวัสดุ</ThemedText>
                  {role === NOTICE_REPAIR_ROLE_HEADER && source === 'header_current' && (
                    <Pressable
                      style={styles.addMatBtn}
                      onPress={() => router.push({
                        pathname: '/notice-repair/add-material',
                        params: { repair_id, staff_id: staffId, role, source },
                      } as Parameters<typeof router.push>[0])}
                    >
                      <IconSymbol name="plus" size={16} color="#FFFFFF" />
                      <ThemedText style={styles.addMatBtnText}>เพิ่มวัสดุ</ThemedText>
                    </Pressable>
                  )}
                </View>
                {requisitions.length > 0 || hasDrafts ? (
                  <View style={styles.matList}>
                    {requisitions.map((r, i) => (
                      <MaterialItemCard
                        key={`saved-${i}`}
                        index={i + 1}
                        name={r.name ?? ''}
                        priceUnit={r.price_unit}
                        amount={r.number}
                        unit={r.unit}
                        total={r.price}
                        statusLabel={
                          r.status === 'd' ? 'จัดหาเอง' : r.status === 'c' ? 'หน่วยอาคารฯ' : undefined
                        }
                      />
                    ))}
                    {draftMaterials.map((d, i) => (
                      <MaterialItemCard
                        key={`draft-${i}`}
                        index={requisitions.length + i + 1}
                        name={d.name}
                        priceUnit={d.price_unit}
                        amount={d.number}
                        unit={d.unit}
                        total={d.price}
                        isDraft
                      />
                    ))}
                  </View>
                ) : (
                  <ThemedText style={styles.matEmptyText}>ไม่มีการจัดหาวัสดุ</ThemedText>
                )}
                {hasDrafts && (
                  <ThemedText style={styles.draftHint}>
                    * รายการที่ไฮไลต์ยังไม่ถูกบันทึก กดปุ่ม “บันทึกรายการวัสดุ” ด้านล่างเพื่อบันทึก
                  </ThemedText>
                )}
              </View>

              {!!detail.header.repair_detail && (
                <View style={styles.damageBlock}>
                  <ThemedText style={styles.tileLabel}>รายละเอียดการซ่อม</ThemedText>
                  <View style={styles.damageBox}>
                    <ThemedText style={styles.damageText}>{detail.header.repair_detail}</ThemedText>
                  </View>
                </View>
              )}

              {!!examineText && (
                <View style={styles.damageBlock}>
                  <ThemedText style={styles.tileLabel}>การตรวจรับงานซ่อม</ThemedText>
                  <View style={styles.damageBox}>
                    <ThemedText style={styles.examineText}>{examineText}</ThemedText>
                  </View>
                </View>
              )}
            </View>
          </Card>
        )}
      </ScrollView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <NavTopBar
        title={TEXT.NOTICE_REPAIR__TITLE}
        subtitle={TEXT.NOTICE_REPAIR_DETAIL_TITLE}
        moduleIcon="wrench.fill"
        showHomeButton
        onBackPress={handleBackPress}
      />

      {renderContent()}

      {/* Bottom action bar — approver only, on a new (001) job */}
      {canApprove && (
        <View style={styles.actionBar}>
          <Pressable
            accessibilityRole="button" disabled={submitting} onPress={onApprove}
            style={[styles.actionBtn, styles.approveBtn, styles.approveFlex, submitting && styles.actionBtnDisabled]}>
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <ThemedText style={styles.approveText}>{TEXT.NOTICE_REPAIR_ACTION_AGREE}</ThemedText>}
          </Pressable>
          <Pressable
            accessibilityRole="button" disabled={submitting} onPress={onNotAgree}
            style={[styles.actionBtn, styles.rejectBtn, styles.quarterFlex, submitting && styles.actionBtnDisabled]}>
            <ThemedText style={styles.rejectText} numberOfLines={1}>{TEXT.NOTICE_REPAIR_ACTION_NOT_AGREE}</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button" disabled={submitting} onPress={onCancelJob}
            style={[styles.actionBtn, styles.cancelBtn, styles.quarterFlex, submitting && styles.actionBtnDisabled]}>
            <ThemedText style={styles.cancelText} numberOfLines={1}>{TEXT.NOTICE_REPAIR_ACTION_CANCEL}</ThemedText>
          </Pressable>
        </View>
      )}

      {/* Bottom action bar — admin only, on a รอรับเรื่อง (admin_pending) job */}
      {canAdminReceive && (
        <View style={styles.actionBar}>
          <Pressable
            accessibilityRole="button" disabled={submitting} onPress={onAdminAccept}
            style={[styles.actionBtn, styles.approveBtn, styles.approveFlex, submitting && styles.actionBtnDisabled]}>
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <ThemedText style={styles.approveText}>{TEXT.NOTICE_REPAIR_ACTION_ADMIN_ACCEPT}</ThemedText>}
          </Pressable>
          <Pressable
            accessibilityRole="button" disabled={submitting} onPress={onEdit}
            style={[styles.actionBtn, styles.editBtn, styles.quarterFlex, submitting && styles.actionBtnDisabled]}>
            <ThemedText style={styles.editText} numberOfLines={1}>{TEXT.NOTICE_REPAIR_ACTION_EDIT}</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button" disabled={submitting} onPress={onAdminReject}
            style={[styles.actionBtn, styles.rejectBtn, styles.quarterFlex, submitting && styles.actionBtnDisabled]}>
            <ThemedText style={styles.rejectText} numberOfLines={1}>{TEXT.NOTICE_REPAIR_ACTION_ADMIN_REJECT}</ThemedText>
          </Pressable>
        </View>
      )}

      {/* Bottom action bar — informer editing/removing their own pending (001) request */}
      {canInformerEdit && (
        <View style={styles.actionBar}>
          <Pressable
            accessibilityRole="button" disabled={submitting} onPress={onEdit}
            style={[styles.actionBtn, styles.approveBtn, styles.threeQuarterFlex, submitting && styles.actionBtnDisabled]}>
            <ThemedText style={styles.approveText}>{TEXT.NOTICE_REPAIR_ACTION_EDIT}</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button" disabled={submitting} onPress={onRemove}
            style={[styles.actionBtn, styles.rejectBtn, styles.quarterFlex, submitting && styles.actionBtnDisabled]}>
            <ThemedText style={styles.rejectText} numberOfLines={1}>{TEXT.NOTICE_REPAIR_ACTION_DELETE}</ThemedText>
          </Pressable>
        </View>
      )}

      {/* Bottom action bar — admin supply: open the full requisition list */}
      {canViewSupply && (
        <View style={styles.actionBar}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({
              pathname: '/notice-repair/requisition',
              params: { repair_id, staff_id: staffId, role, source },
            } as Parameters<typeof router.push>[0])}
            style={[styles.actionBtn, styles.approveBtn, styles.approveFlex]}>
            <ThemedText style={styles.approveText}>{TEXT.NOTICE_REPAIR_SUPPLY_VIEW_ALL}</ThemedText>
          </Pressable>
        </View>
      )}

      {/* Bottom action bar — save staged (unsaved) materials */}
      {draftMaterials.length > 0 && (
        <View style={styles.actionBar}>
          <Pressable
            accessibilityRole="button"
            disabled={savingMaterials}
            onPress={() => setMaterialConfirm('save')}
            style={[styles.actionBtn, styles.approveBtn, styles.approveFlex, savingMaterials && styles.actionBtnDisabled]}>
            {savingMaterials
              ? <ActivityIndicator color="#fff" />
              : <ThemedText style={styles.approveText}>{`บันทึกรายการวัสดุ (${draftMaterials.length})`}</ThemedText>}
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

      {/* Same confirm-with-summary modal for both Save and back buttons */}
      <ConfirmModal
        visible={materialConfirm !== null}
        title="ยืนยันการบันทึกรายการวัสดุ"
        message={`ตรวจสอบรายการวัสดุก่อนบันทึก:\n\n${draftSummary}`}
        confirmLabel="บันทึก"
        cancelLabel="ยกเลิก"
        loading={savingMaterials}
        onConfirm={onConfirmSaveMaterials}
        onCancel={() => { if (!savingMaterials) setMaterialConfirm(null); }}
      />
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.surfaceAlt },
  loader: { flex: 1 },
  stateContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: c.primary, fontSize: 14, lineHeight: 20, textAlign: 'center' },

  scroll: { padding: 20, gap: 24 },
  scrollWithActions: { paddingBottom: 128 },
  scrollTopAnchor: { position: 'absolute', top: 0, left: 0, width: 0, height: 0 },

  card: {
    borderRadius: 24,
    shadowColor: c.shadow,
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
  summaryTitle: { fontSize: 18, fontWeight: '700', lineHeight: 24, color: c.text },
  requestNo: { fontSize: 14, color: c.textMuted, lineHeight: 20 },
  statusBadge: { borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 6, maxWidth: '42%' },
  statusText: { fontSize: 12, fontWeight: '600', lineHeight: 16 },
  summaryBody: { gap: 16 },
  kvBlock: { gap: 4 },
  kicker: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, color: c.primary },
  kickerValueRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  kickerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.primarySoft,
  },
  kickerValue: { flex: 1, fontSize: 16, fontWeight: '600', lineHeight: 24, color: c.text },
  dateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceAlt,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dateText: { fontSize: 16, fontWeight: '500', lineHeight: 24, color: c.textMuted },

  // Section headings
  sectionHeading: { fontSize: 16, fontWeight: '600', lineHeight: 24, color: c.text },

  // Requester card
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
    padding: 16,
  },
  avatarWrap: { width: 64, height: 64 },
  avatar: { width: 64, height: 64, borderRadius: 9999, borderWidth: 2, borderColor: c.textOnPrimary, backgroundColor: c.border },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 22, fontWeight: '700', color: c.primary },
  profileTextBlock: { flex: 1, gap: 3 },
  profileName: { fontSize: 16, fontWeight: '700', lineHeight: 22, color: c.text },
  profileRole: { fontSize: 14, color: c.textMuted, lineHeight: 20 },

  dividerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  rowLabel: { fontSize: 14, color: c.textMuted, lineHeight: 20 },
  rowValue: { flex: 1, textAlign: 'right', fontSize: 14, fontWeight: '600', lineHeight: 20, color: c.text },

  // Location card
  tileGroup: { gap: 16 },
  infoTile: { borderRadius: 16, backgroundColor: c.surfaceAlt, padding: 12, gap: 4 },
  tileLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, color: c.textFaint, textTransform: 'uppercase' },
  tileValue: { fontSize: 16, lineHeight: 24, color: c.textMuted },
  damageBlock: { gap: 8 },
  damageBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
    padding: 16,
  },
  damageText: { fontSize: 16, lineHeight: 24, color: c.textMuted },

  // Header assignment / materials / examine
  techProfileName: { fontSize: 15, fontWeight: '700', lineHeight: 20, color: c.text },
  techListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  techListItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  matHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addMatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: c.primary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addMatBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textOnPrimary,
  },
  matList: { marginTop: 12, gap: 10 },
  matItem: {
    borderWidth: 1, borderColor: c.border, borderRadius: 14,
    backgroundColor: c.surface, padding: 12, gap: 10,
  },
  matItemDraft: { backgroundColor: c.warningSoft, borderColor: c.warning },
  matItemHead: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8,
  },
  matItemName: { flex: 1, fontSize: 15, fontWeight: '700', color: c.text, lineHeight: 20 },
  matStatusTag: {
    backgroundColor: c.successSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2,
  },
  matStatusTagText: { fontSize: 11, fontWeight: '700', color: c.success },
  matItemRows: {
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border, paddingTop: 8, gap: 6,
  },
  matDetailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  matDetailLabel: { fontSize: 13, color: c.textMuted },
  matDetailValue: { flex: 1, textAlign: 'right', fontSize: 14, fontWeight: '600', color: c.text },
  matDetailValueEmphasis: { fontSize: 15, fontWeight: '700', color: c.primary },
  draftTagCell: { alignItems: 'center', justifyContent: 'center' },
  draftTag: {
    fontSize: 11, fontWeight: '700', color: c.warning,
    backgroundColor: c.warningSoft, borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden',
  },
  draftHint: { marginTop: 10, fontSize: 12, color: c.warning, lineHeight: 18 },
  matEmptyText: { marginTop: 12, fontSize: 14, color: c.textFaint, textAlign: 'center' },
  examineText: { fontSize: 15, fontWeight: '600', color: c.success, lineHeight: 22, marginTop: 4 },

  // Bottom action bar
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
  threeQuarterFlex: { flex: 3 },
  quarterFlex: { flex: 1 },
  approveBtn: {
    backgroundColor: c.primary,
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  approveText: { fontSize: 14, fontWeight: '700', color: c.textOnPrimary },
  rejectBtn: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FEE2E2' },
  rejectText: { fontSize: 14, fontWeight: '600', color: c.primary },
  cancelBtn: { borderWidth: 1, borderColor: c.border },
  cancelText: { fontSize: 14, fontWeight: '600', color: c.textMuted },
  editBtn: { backgroundColor: c.infoSoft, borderWidth: 1, borderColor: '#DBEAFE' },
  editText: { fontSize: 14, fontWeight: '600', color: c.info },
});

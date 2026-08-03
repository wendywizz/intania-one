import { LoadingAnimate } from '@/components/loading-animate';
import { ConfirmModal } from '@/components/notice-repair/confirm-modal';
import { MaterialItemCard } from '@/components/notice-repair/material-item-card';
import { ScreenHeader } from '@/components/screen-header';
import { SectionCard } from '@/components/section-card';
import { useToast } from '@/components/toast-provider';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DetailInfoCard, DetailRows } from '@/components/ui/detail-info-card';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { PersonListCard } from '@/components/ui/person-list-card';
import { UserAvatar } from '@/components/user-avatar';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { NOTICE_REPAIR_ROLE_APPROVE, NOTICE_REPAIR_ROLE_ADMIN, NOTICE_REPAIR_ROLE_HEADER, NOTICE_REPAIR_ROLE_INFORMER } from '@/constants/types';
import { useAuth } from '@/context/AuthContext';
import type { NoticeRepairDetail } from '@/models/types';
import { addRequisition, adminAcceptRepair, approveRepair, cancelRepair, getFullDetail } from '@/services/noticeRepairService';
import {
  clearDraftMaterials,
  consumeScrollToMaterials,
  useDraftMaterials,
} from '@/stores/draftMaterials';
import { getCategoryIcon } from '@/utils/category-icon';
import { formatDateOnly, formatDateRange } from '@/utils/date-format';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { type AppColors, useColors, useScreenGutter, useThemedStyles } from '@/constants/theme';
import { boxShadow } from '@/constants/shadows';

// New job awaiting approval — the only status where the approver's
// เห็นชอบ / ไม่เห็นชอบ / ยกเลิก actions are valid (see Repair_Controller).
const STATUS_NEW = '001';

// Same pastel status swatches the absence detail screen uses, keyed by the
// repair status code instead of a label keyword.
const STATUS_APPROVED = { bg: '#D1FAE5', color: '#065F46' };
const STATUS_PENDING = { bg: '#FEF3C7', color: '#92400E' };
const STATUS_REJECTED = { bg: '#FEE2E2', color: '#991B1B' };

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  '001': STATUS_PENDING, '002': STATUS_APPROVED, '003': STATUS_PENDING,
  '004': STATUS_PENDING, '005': STATUS_PENDING, '006': STATUS_PENDING,
  '007': STATUS_PENDING, '008': STATUS_APPROVED, '106': STATUS_APPROVED,
  '200': STATUS_REJECTED,
};

function statusColor(s?: string) {
  if (!s) return STATUS_PENDING;
  if (s.startsWith('1') && s !== '106') return STATUS_REJECTED;
  return STATUS_COLORS[s] ?? STATUS_PENDING;
}

// Photos are keyed by the zero-padded 7-digit staff id.
function normalizeStaffId(id: string) {
  return /^\d+$/.test(id) ? id.padStart(7, '0') : id;
}

type StaffEntry = { name: string; position?: string | null; staffId?: string };

/** Avatar + name + position row, matching the absence detail person cards. */
function PersonRow({ name, position, staffId }: StaffEntry) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.personCard}>
      <UserAvatar staffId={staffId ? normalizeStaffId(staffId) : ''} size={44} />
      <View style={styles.personText}>
        <ThemedText style={styles.personName}>{name || '-'}</ThemedText>
        {position ? <ThemedText style={styles.personPosition}>{position}</ThemedText> : null}
      </View>
    </View>
  );
}

type MenuAction = {
  key: string;
  label: string;
  icon: IconSymbolName;
  /** Text/icon colour; defaults to the normal text colour. */
  color?: string;
  onPress: () => void;
};

// Kebab button in the action bar that pops its actions upward, so the bar keeps
// a single primary action however many secondary ones a role has.
function SecondaryActionMenu({ actions, disabled }: { actions: MenuAction[]; disabled?: boolean }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.menuAnchor}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={TEXT.NOTICE_REPAIR_ACTION_MORE}
        accessibilityState={{ expanded: open }}
        disabled={disabled}
        onPress={() => setOpen((isOpen) => !isOpen)}
        style={[styles.actionBtn, styles.menuBtn, disabled && styles.actionBtnDisabled]}>
        <IconSymbol name="ellipsis.vertical" size={20} color={c.textMuted} />
      </Pressable>

      {open && (
        <View style={styles.menuSheet}>
          {actions.map((action, index) => (
            <Fragment key={action.key}>
              {index > 0 ? <View style={styles.menuDivider} /> : null}
              <Pressable
                accessibilityRole="menuitem"
                disabled={disabled}
                onPress={() => { setOpen(false); action.onPress(); }}
                style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}>
                <IconSymbol name={action.icon} size={16} color={action.color ?? c.text} />
                <ThemedText style={[styles.menuItemText, { color: action.color ?? c.text }]}>
                  {action.label}
                </ThemedText>
              </Pressable>
            </Fragment>
          ))}
        </View>
      )}
    </View>
  );
}

export default function NoticeRepairDetailScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const gutter = useScreenGutter();
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

  // Head of category reviewing a finished repair record: the materials are
  // read-only here, so link out to the supply list instead of inlining it.
  const canViewSupplyList =
    role === NOTICE_REPAIR_ROLE_HEADER && source === 'header_repair_record';

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

  // The request number rides in the nav bar, so the info card no longer repeats it.
  const navTitle = detail?.repair_number
    ? `${TEXT.NOTICE_REPAIR_JOB_ID_LABEL} ${detail.repair_number}`
    : TEXT.NOTICE_REPAIR__TITLE;

  const renderContent = () => {
    if (isLoading) {
      return <LoadingAnimate title={TEXT.SHARED_LOADING_DATA_TITLE} desc={TEXT.SHARED_LOADING_DESCRIPTION} />;
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

    const canAddMaterial = role === NOTICE_REPAIR_ROLE_HEADER && source === 'header_current';

    return (
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: gutter },
          (canApprove || canAdminReceive || canInformerEdit || canViewSupply || canViewSupplyList || hasDrafts)
            && styles.scrollWithActions,
        ]}
        showsVerticalScrollIndicator={false}>

        {/* Content-top anchor for scroll-to-materials (zero-size, no layout impact) */}
        <View ref={topAnchorRef} style={styles.scrollTopAnchor} pointerEvents="none" />

        {/* ── Repair info ── */}
        <DetailInfoCard
          title={TEXT.NOTICE_REPAIR_DETAIL_TITLE}
          trailing={
            status ? (
              <View style={[styles.statusBadge, { backgroundColor: sColor.bg }]}>
                <ThemedText style={[styles.statusText, { color: sColor.color }]} numberOfLines={1}>
                  {detail.repair_status_name ?? status}
                </ThemedText>
              </View>
            ) : null
          }
          rows={[
            {
              label: TEXT.NOTICE_REPAIR_DETAIL_CATEGORY,
              value: detail.work_category_name ?? '',
              icon: getCategoryIcon(detail.work_category_name),
            },
            { label: 'วันที่แจ้ง', value: dateText, icon: 'calendar' },
            { label: 'อาคาร', value: detail.building_name ?? '', icon: 'house.fill' },
            { label: 'สถานที่ / ห้อง', value: detail.repair_place ?? '', icon: 'mappin' },
            { label: 'รายละเอียดความชำรุด', value: detail.repair_inform ?? '', icon: 'list.bullet' },
          ]}
        />

        {/* ── Requester (person + how to reach them) ── */}
        {(detail.informer_name || informerId) && (
          <SectionCard title="ผู้แจ้งซ่อม">
            <PersonRow
              name={detail.informer_name ?? ''}
              position={detail.informer_position}
              staffId={informerId}
            />
            <DetailRows
              style={styles.personRows}
              rows={[
                { label: TEXT.NOTICE_REPAIR_DETAIL_DEPARTMENT, value: detail.repair_inform_dept_name ?? '', icon: 'briefcase.fill' },
                { label: 'เบอร์โทรศัพท์', value: detail.repair_tel ?? '', icon: 'phone.fill' },
              ]}
            />
          </SectionCard>
        )}

        {/* ── For head of category: assignment / technicians / materials / examine ── */}
        {detail.header && (
          <>
            <DetailInfoCard
              title="สำหรับหัวหน้าหมวดงาน"
              rows={[
                { label: 'วันที่ดำเนินการซ่อม / ดูสถานที่', value: opDateRange, icon: 'calendar-range' },
                { label: 'ประเมินการซ่อม', value: assessmentText, icon: 'wrench.fill' },
                { label: 'รายละเอียดการซ่อม', value: detail.header.repair_detail ?? '', icon: 'list.bullet' },
                { label: 'การตรวจรับงานซ่อม', value: examineText, icon: 'checkmark.circle.fill' },
              ]}
            />

            {technicians.length > 0 && (
              <PersonListCard
                title="ช่างที่รับผิดชอบ"
                countSuffix=" คน"
                people={technicians.map((t, i) => ({
                  key: `${t.staff_id ?? t.name}-${i}`,
                  name: t.name ?? '',
                  photoStaffId: t.staff_id ? normalizeStaffId(t.staff_id) : undefined,
                }))}
              />
            )}

            {/* Screens that link out to a supply screen from the action bar
                (admin supply sources, header repair record) skip the inline
                list — it would only duplicate what the link opens. */}
            {!canViewSupply && !canViewSupplyList && (
            <View ref={materialSectionRef}>
              <SectionCard
                title="รายการวัสดุ"
                trailing={
                  canAddMaterial ? (
                    <Pressable
                      accessibilityRole="button"
                      style={styles.addMatBtn}
                      onPress={() => router.push({
                        pathname: '/notice-repair/add-material',
                        params: { repair_id, staff_id: staffId, role, source },
                      } as Parameters<typeof router.push>[0])}
                    >
                      <IconSymbol name="plus" size={16} color={c.textOnPrimary} />
                      <ThemedText style={styles.addMatBtnText}>เพิ่มวัสดุ</ThemedText>
                    </Pressable>
                  ) : null
                }
              >
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
                  <View style={styles.matEmpty}>
                    <IconSymbol name="package.plus" size={20} color={c.textFaint} />
                    <ThemedText style={styles.matEmptyText}>ไม่มีการจัดหาวัสดุ</ThemedText>
                  </View>
                )}
                {hasDrafts && (
                  <ThemedText style={styles.draftHint}>
                    * รายการที่ไฮไลต์ยังไม่ถูกบันทึก กดปุ่ม “บันทึกรายการวัสดุ” ด้านล่างเพื่อบันทึก
                  </ThemedText>
                )}
              </SectionCard>
            </View>
            )}
          </>
        )}
      </ScrollView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader
        title={navTitle}
        onBackPress={handleBackPress}
        titleInNavBar
        tone="primary"
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
          <SecondaryActionMenu
            disabled={submitting}
            actions={[
              {
                key: 'not-agree',
                label: TEXT.NOTICE_REPAIR_ACTION_NOT_AGREE,
                icon: 'xmark.circle',
                color: c.primary,
                onPress: onNotAgree,
              },
              {
                key: 'cancel',
                label: TEXT.NOTICE_REPAIR_ACTION_CANCEL,
                icon: 'trash.fill',
                color: c.danger,
                onPress: onCancelJob,
              },
            ]}
          />
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
          <SecondaryActionMenu
            disabled={submitting}
            actions={[
              {
                key: 'edit',
                label: TEXT.NOTICE_REPAIR_ACTION_EDIT,
                icon: 'pencil',
                onPress: onEdit,
              },
              {
                key: 'admin-reject',
                label: TEXT.NOTICE_REPAIR_ACTION_ADMIN_REJECT,
                icon: 'arrow.triangle.2.circlepath',
                color: c.primary,
                onPress: onAdminReject,
              },
            ]}
          />
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

      {/* Bottom action bar — head of category: open the read-only supply list */}
      {canViewSupplyList && (
        <View style={styles.actionBar}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({
              pathname: '/notice-repair/supply-list',
              params: { repair_id, staff_id: staffId },
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
  container: { flex: 1, backgroundColor: c.background },
  stateContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: c.primary, fontSize: 14, lineHeight: 20, textAlign: 'center' },

  // Same scroll rhythm as the absence detail screen (gutter applied inline).
  scrollContent: { paddingTop: 28, paddingBottom: 40, gap: 12 },
  scrollWithActions: { paddingBottom: 128 },
  scrollTopAnchor: { position: 'absolute', top: 0, left: 0, width: 0, height: 0 },

  statusBadge: { borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 5, flexShrink: 0, maxWidth: '52%' },
  statusText: { fontFamily: AppFonts.psuBold, fontSize: 12, lineHeight: 16 },

  // Person rows (requester / technicians) — identical to the absence detail cards.
  personCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 18 },
  // Contact rows sit under the person row inside the same card — the hairline
  // separates the two halves.
  personRows: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  personText: { flex: 1, gap: 3 },
  personName: { fontFamily: AppFonts.psuBold, fontSize: 15, lineHeight: 21, color: c.text },
  personPosition: { fontSize: 13, lineHeight: 18, color: c.textMuted },

  // Materials
  addMatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: c.pomegranate,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addMatBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textOnPrimary,
  },
  matList: { gap: 10 },
  draftHint: { marginTop: 10, fontSize: 12, color: c.warning, lineHeight: 18 },
  matEmpty: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  matEmptyText: { fontSize: 14, color: c.textFaint, textAlign: 'center' },

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
    backgroundColor: c.pomegranate,
    boxShadow: boxShadow(c.primary, { y: 6, blur: 8, opacity: 0.25 }),
  },
  approveText: { fontSize: 14, fontWeight: '700', color: c.textOnPrimary },
  rejectBtn: { backgroundColor: c.primarySoft, borderWidth: 1, borderColor: c.primarySoft },
  rejectText: { fontSize: 14, fontWeight: '600', color: c.primary },

  // Secondary-action menu: a kebab button in the action bar that pops its items
  // upward, so the bar keeps a single primary action.
  menuAnchor: { flexShrink: 0 },
  menuBtn: {
    width: 48,
    paddingHorizontal: 0,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  menuSheet: {
    position: 'absolute',
    bottom: '100%',
    right: 0,
    marginBottom: 8,
    minWidth: 180,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.surface,
    overflow: 'hidden',
    boxShadow: boxShadow(c.shadow, { y: 4, blur: 12, opacity: 0.12 }),
    // Replaces the `elevation` this had before boxShadow — on Android that was
    // also what stacked this dropdown above the row beneath it.
    zIndex: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  menuItemPressed: { backgroundColor: c.surfaceMuted },
  menuItemText: { fontSize: 14, fontWeight: '600' },
  menuDivider: { height: StyleSheet.hairlineWidth, backgroundColor: c.border },
});

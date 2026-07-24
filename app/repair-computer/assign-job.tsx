import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

import { AppToast } from "@/components/app-toast";
import { SubmittingOverlay } from "@/components/submitting-overlay";
import { LoadingAnimate } from "@/components/loading-animate";
import { NavTopBar } from "@/components/nav-top-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button, ConfirmDialog, IconSymbol } from "@/components/ui";
import { DetailInfoCard } from "@/components/ui/detail-info-card";
import { PersonListCard } from "@/components/ui/person-list-card";
import { TEXT } from "@/constants/text";
import { PRIVILEGE_RC_FOREMAN } from "@/constants/types";
import { USER_ID } from "@/constants/user";
import { useAuth } from "@/context/AuthContext";
import { setRepairComputerSelectedRole } from "@/context/repairComputerRoleSelection";
import type { Person, RepairComputer } from "@/models/types";
import { getPersonPhoto } from "@/services/personService";
import {
    assignJob,
    getJobDetail,
    getRepairComputerWorkers,
    getRepairTypes,
} from "@/services/repairComputerService";
import { formatDateTime } from "@/utils/date-format";
import { getRepairComputerTypeIcon } from "@/utils/category-icon";

type AssignStep = "repairType" | "worker" | "confirm";
type RepairTypeOption = Record<string, unknown>;

const TEXT_NONE = "-";
// Shown when a person's photo can't be loaded (or there's no staff id).
const USER_PLACEHOLDER = require("../../assets/images/user-placeholder.jpg");

// ── Value helpers (identical to original) ────────────────────────────────────

function getValue(
  row: Record<string, unknown> | null | undefined,
  fields: string[],
) {
  if (!row) return "";
  for (const field of fields) {
    const value = row[field];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function getRepairTypeId(item: RepairTypeOption) {
  return getValue(item, ["id", "repairType", "repair_type", "value"]);
}

function getRepairTypeName(item: RepairTypeOption) {
  return (
    getValue(item, ["name", "repairTypeName", "repair_type_name", "label"]) ||
    getRepairTypeId(item)
  );
}

function normalizeNumericStaffId(staffId: string) {
  return /^\d+$/.test(staffId) ? staffId.padStart(7, "0") : staffId;
}

function getWorkerId(worker: Person) {
  const id = getValue(worker, [
    "staffId", "staffID", "staff_id", "STAFF_ID", "STAFFID",
    "worker", "workerId", "workerID", "worker_id", "id",
  ]);
  return normalizeNumericStaffId(id);
}

function getWorkerPhotoStaffId(worker: Person) {
  const id = getValue(worker, [
    "uni_staff_id", "UNI_STAFF_ID", "uniStaffId", "uniStaffID",
    "staffId", "staffID", "staff_id", "STAFF_ID", "STAFFID",
  ]);
  return normalizeNumericStaffId(id);
}

function getWorkerAssignId(worker: Person) {
  const id = getWorkerId(worker) || getWorkerPhotoStaffId(worker);
  return /^\d+$/.test(id) ? id.padStart(7, "0") : id;
}

function getWorkerPrefix(worker: Person) {
  const t2 = getValue(worker, ["titleName2", "title_name_2", "TITLE_NAME_2"]);
  const t3 = getValue(worker, ["titleName3", "title_name_3", "TITLE_NAME_3"]);
  return (
    [t2, t3].filter(Boolean).join("") ||
    getValue(worker, ["prefixNameTH", "prefix_name_th", "PREFIX_NAME_TH", "prefix"])
  );
}

function getWorkerName(worker: Person) {
  const full = getValue(worker, ["workerFullname", "worker_fullname", "fullname", "fullName", "staffName", "name"]);
  const firstTH = getValue(worker, ["firstNameTH", "first_name_th", "firstnameTH", "firstname_th", "FIRST_NAME_TH"]);
  const lastTH = getValue(worker, ["lastNameTH", "last_name_th", "lastnameTH", "lastname_th", "LAST_NAME_TH"]);
  const firstEN = getValue(worker, ["firstNameEN", "first_name_en", "firstnameEN", "firstname_en", "firstName", "first_name", "FIRST_NAME_EN"]);
  const lastEN = getValue(worker, ["lastNameEN", "last_name_en", "lastnameEN", "lastname_en", "lastName", "last_name", "LAST_NAME_EN"]);
  const thaiName = [getWorkerPrefix(worker), firstTH, lastTH].filter(Boolean).join(" ");
  const enName = [firstEN, lastEN].filter(Boolean).join(" ");
  return full || thaiName || enName || getWorkerId(worker);
}

function getWorkerPosition(worker: Person) {
  return getValue(worker, ["positionName", "position_name", "POSITION_NAME", "position"]);
}

function getWorkerDept(worker: Person) {
  return getValue(worker, ["deptName", "dept_name", "DEPT_NAME", "department", "faculty"]);
}

// Step badge style (replaces status badge in summary card)
function getStepBadgeStyle(step: AssignStep) {
  if (step === "confirm") return { background: "#DCFCE7", text: "#166534" };
  if (step === "worker")  return { background: "#FFF3F3", text: "#922124" };
  return { background: "#F2F3F7", text: "#584140" };
}

function getStepBadgeLabel(step: AssignStep) {
  if (step === "repairType") return "Step 1 of 3";
  if (step === "worker")     return "Step 2 of 3";
  return "Step 3 of 3";
}

// ── Shared UI (mirroring foreman-job-detail) ─────────────────────────────────

function SectionCard({ children, title }: { children: ReactNode; title: string }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <ThemedView style={styles.sectionCard} lightColor="#FFFFFF" darkColor="#151718">
      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>{title}</ThemedText>
      {children}
    </ThemedView>
  );
}

function RowDetail({ title, description }: { title: string; description: string }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.rowDetail}>
      <ThemedText style={styles.rowTitle}>{title}</ThemedText>
      <ThemedText type="defaultSemiBold" style={styles.rowDescription}>{description}</ThemedText>
    </View>
  );
}

// PersonSummaryCard identical in structure to foreman-job-detail
function PersonSummaryCard({
  fallbackTitle,
  id,
  meta,
  name,
  role,
}: {
  fallbackTitle: string;
  id: string;
  meta?: string;
  name: string;
  role?: string;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const staffId = normalizeNumericStaffId(id);
  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = Boolean(staffId) && !photoFailed;
  const fallbackInitial = (name || fallbackTitle).trim().charAt(0).toUpperCase();

  return (
    <View style={styles.personCard}>
      {showPhoto ? (
        <Image
          onError={() => setPhotoFailed(true)}
          source={{ uri: getPersonPhoto({ staffId }) }}
          style={styles.personPhoto}
        />
      ) : (
        <Image source={USER_PLACEHOLDER} style={styles.personPhoto} />
      )}
      <View style={styles.personText}>
        <ThemedText type="defaultSemiBold" style={styles.personName} numberOfLines={2}>
          {name || fallbackTitle}
        </ThemedText>
        {role ? (
          <ThemedText style={styles.personRole} numberOfLines={1}>{role}</ThemedText>
        ) : null}
        {meta ? (
          <ThemedText style={styles.personMeta} numberOfLines={2}>{meta}</ThemedText>
        ) : null}
      </View>
    </View>
  );
}

function WorkerSelectRow({
  worker,
  photoId,
  name,
  position,
  dept,
  isSelected,
  onPress,
}: {
  worker: Person;
  photoId: string;
  name: string;
  position: string;
  dept: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = Boolean(photoId) && !photoFailed;
  const fallbackInitial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.workerRow, isSelected && styles.workerRowSelected]}
    >
      {showPhoto ? (
        <Image
          onError={() => setPhotoFailed(true)}
          source={{ uri: getPersonPhoto({ ...worker, staffId: photoId }) }}
          style={styles.workerPhoto}
        />
      ) : (
        <Image source={USER_PLACEHOLDER} style={styles.workerPhoto} />
      )}
      <View style={styles.workerText}>
        <ThemedText
          type="defaultSemiBold"
          style={[styles.workerName, isSelected && styles.workerNameSelected]}
          numberOfLines={2}
        >
          {name}
        </ThemedText>
        {position ? (
          <ThemedText style={styles.workerMeta} numberOfLines={1}>{position}</ThemedText>
        ) : null}
        {dept ? (
          <ThemedText style={styles.workerMeta} numberOfLines={1}>{dept}</ThemedText>
        ) : null}
      </View>
      <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
        {isSelected && <View style={styles.radioDot} />}
      </View>
    </Pressable>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function AssignJobScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const params = useLocalSearchParams<{
    backHref?: string | string[];
    id?: string | string[];
  }>();
  const jobId = Array.isArray(params.id) ? params.id[0] : params.id;
  const backHrefParam = Array.isArray(params.backHref) ? params.backHref[0] : params.backHref;
  const backHref = backHrefParam || "/repair-computer/foreman-new-job";

  const { user: authUser } = useAuth();
  const foremanId = authUser?.staffId || USER_ID;

  const [step, setStep] = useState<AssignStep>("repairType");
  const [jobDetail, setJobDetail] = useState<RepairComputer | null>(null);
  const [repairTypes, setRepairTypes] = useState<RepairTypeOption[]>([]);
  const [workers, setWorkers] = useState<Person[]>([]);
  const [selectedRepairType, setSelectedRepairType] = useState<RepairTypeOption | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<Person | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "">("");

  const selectedRepairTypeId = selectedRepairType ? getRepairTypeId(selectedRepairType) : "";
  const selectedWorkerId = selectedWorker ? getWorkerAssignId(selectedWorker) : "";

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!jobId) {
      setError(TEXT.REPAIR_COMPUTER_UNABLE_TO_LOAD_JOB_DETAIL);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const [detailResult, repairTypeResult] = await Promise.all([
        getJobDetail(jobId),
        getRepairTypes(),
      ]);
      setJobDetail(detailResult);
      setRepairTypes(repairTypeResult.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : TEXT.REPAIR_COMPUTER_UNABLE_TO_LOAD_JOB_DETAIL,
      );
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadWorkers = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await getRepairComputerWorkers();
      setWorkers(result.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load workers.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Navigation ──────────────────────────────────────────────────────────────

  const handleBackPress = () => {
    if (step === "confirm") { setStep("worker"); return; }
    if (step === "worker")  { setStep("repairType"); return; }
    if (jobId) {
      router.replace({
        pathname: "/repair-computer/foreman-job-detail",
        params: { id: jobId, backHref: "/repair-computer/foreman-new-job" },
      } as Parameters<typeof router.replace>[0]);
      return;
    }
    router.replace(backHref as Parameters<typeof router.replace>[0]);
  };

  const handleRepairTypeNext = async () => {
    if (!selectedRepairTypeId) return;
    setStep("worker");
    if (!workers.length) await loadWorkers();
  };

  const handleAssign = async () => {
    if (!jobId || !selectedRepairTypeId || !selectedWorkerId || isSubmitting) return;
    setIsSubmitting(true);
    setToastMessage("");
    setToastType("");
    try {
      const result = await assignJob(jobId, selectedRepairTypeId, selectedWorkerId, foremanId);
      setRepairComputerSelectedRole(foremanId, PRIVILEGE_RC_FOREMAN);
      setToastType("success");
      setToastMessage(result.message || TEXT.REPAIR_COMPUTER_JOB_UPDATED_SUCCESS_MESSAGE);
      setTimeout(() => { router.replace("/repair-computer/foreman-new-job"); }, 1500);
    } catch (assignError) {
      setToastType("error");
      setToastMessage(
        assignError instanceof Error
          ? assignError.message
          : TEXT.REPAIR_COMPUTER_UNABLE_TO_UPDATE_JOB,
      );
    } finally {
      setIsSubmitting(false);
      setIsConfirmOpen(false);
    }
  };

  // ── Derived job values (matching foreman-job-detail field names) ────────────

  const requesterName = getValue(jobDetail, ["staffFullname", "staff_fullname", "staffullName"]);
  const requesterId   = getValue(jobDetail, [
    "staff_uni_id", "staffUniId", "STAFF_UNI_ID",
    "staffId", "staffID", "staff_id", "STAFF_ID",
    "informStaffId", "inform_staff_id",
  ]);
  const deptName      = getValue(jobDetail, ["deptName", "dept_name", "department"]);
  const supplyCode    = getValue(jobDetail, ["supplyCode", "supply_code"]);
  const phone         = getValue(jobDetail, ["phone", "tel", "telephone"]);
  const detail        = getValue(jobDetail, ["detail", "description", "repairDetail", "repair_detail", "problem"]);
  const informDateTime = getValue(jobDetail, ["informDateTime", "inform_date_time", "informDate", "inform_date"]);

  const badgeStyle = useMemo(() => getStepBadgeStyle(step), [step]);

  // ── CTA config ──────────────────────────────────────────────────────────────

  const ctaLabel =
    step === "repairType" ? TEXT.REPAIR_COMPUTER_NEXT_SELECT_WORKER
    : step === "worker"   ? TEXT.REPAIR_COMPUTER_NEXT_REVIEW
    : TEXT.REPAIR_COMPUTER_ASSIGN_CONFIRM_TITLE;

  const ctaDisabled =
    step === "repairType" ? !selectedRepairTypeId
    : step === "worker"   ? !selectedWorker
    : false;

  const handleCta = () => {
    if (step === "repairType") { handleRepairTypeNext(); return; }
    if (step === "worker")     { setStep("confirm"); return; }
    setIsConfirmOpen(true);
  };

  // ── Loading / error ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <NavTopBar title={TEXT.REPAIR_COMPUTER_TITLE} onBackPress={handleBackPress} showBackButton />
        <View style={styles.stateContent}>
          <LoadingAnimate title={TEXT.SHARED_LOADING_DATA_TITLE} desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT} />
        </View>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <NavTopBar title={TEXT.REPAIR_COMPUTER_TITLE} onBackPress={handleBackPress} showBackButton />
        <View style={styles.stateContent}>
          <ThemedText type="subtitle">{TEXT.SHARED_SOMETHING_WENT_WRONG}</ThemedText>
          <ThemedText style={[styles.stateMessage, styles.errorText]}>{error}</ThemedText>
          <Pressable
            accessibilityRole="button"
            onPress={step === "worker" ? loadWorkers : loadData}
            style={styles.retryButton}
          >
            <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
              {TEXT.SHARED_RETRY}
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  // ── Step renders ────────────────────────────────────────────────────────────

  const renderRepairTypeStep = () => (
    <>
      {repairTypes.length === 0 ? (
        <ThemedText style={styles.emptyMessage}>{TEXT.REPAIR_COMPUTER_NO_REPAIR_TYPES}</ThemedText>
      ) : (
        <View style={styles.listGroup}>
          {repairTypes.map((item, index) => {
            const itemId = getRepairTypeId(item);
            const isSelected = selectedRepairTypeId === itemId;
            return (
              <View key={itemId || `type-${index}`}>
                {index > 0 && <View style={styles.listDivider} />}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSelectedRepairType(item)}
                  style={[styles.typeRow, isSelected && styles.typeRowSelected]}
                >
                  <View style={[styles.typeIconBox, isSelected && styles.typeIconBoxSelected]}>
                    <IconSymbol
                      name={getRepairComputerTypeIcon(itemId, getRepairTypeName(item))}
                      size={20}
                      color={isSelected ? "#B33939" : "#8A8F9D"}
                    />
                  </View>
                  <ThemedText
                    type="defaultSemiBold"
                    style={[styles.typeName, isSelected && styles.typeNameSelected]}
                  >
                    {getRepairTypeName(item)}
                  </ThemedText>
                  <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
    </>
  );

  const renderWorkerStep = () => (
    <>
      {workers.length === 0 ? (
        <ThemedText style={styles.emptyMessage}>{TEXT.REPAIR_COMPUTER_NO_WORKERS}</ThemedText>
      ) : (
        <View style={styles.listGroup}>
          {workers.map((item, index) => {
            const wId = getWorkerId(item);
            const photoId = getWorkerPhotoStaffId(item);
            const isSelected =
              selectedWorker === item || (Boolean(wId) && selectedWorkerId === wId);
            const position = getWorkerPosition(item);
            const dept = getWorkerDept(item);
            return (
              <View key={wId || `worker-${index}`}>
                {index > 0 && <View style={styles.listDivider} />}
                <WorkerSelectRow
                  worker={item}
                  photoId={photoId || wId}
                  name={getWorkerName(item)}
                  position={position}
                  dept={dept}
                  isSelected={isSelected}
                  onPress={() => setSelectedWorker(item)}
                />
              </View>
            );
          })}
        </View>
      )}
    </>
  );

  const renderConfirmStep = () => (
    <>
      {/* Job info — titled card + icon/label/value rows, like absence detail. */}
      <DetailInfoCard
        title={TEXT.REPAIR_COMPUTER_JOB_DETAIL}
        rows={[
          {
            label: TEXT.REPAIR_COMPUTER_DETAIL,
            value: selectedRepairType ? getRepairTypeName(selectedRepairType) : "",
            icon: "wrench.fill",
          },
          { label: TEXT.REPAIR_COMPUTER_SUPPLY_CODE_LABEL, value: supplyCode, icon: "doc.text.fill" },
          {
            label: TEXT.REPAIR_COMPUTER_INFORM_DATE_LABEL,
            value: informDateTime ? formatDateTime(informDateTime) : "",
            icon: "calendar",
          },
          { label: TEXT.REPAIR_COMPUTER_DETAIL_LABEL, value: detail, icon: "text.bubble" },
        ]}
      />

      <PersonListCard
        title={TEXT.REPAIR_COMPUTER_INFORMER_SECTION}
        showCount={false}
        people={[
          {
            key: "informer",
            name: requesterName || TEXT.REPAIR_COMPUTER_INFORMER_NAME,
            subtitle: [deptName, phone].filter(Boolean).join(" · ") || undefined,
            photoStaffId: requesterId || undefined,
          },
        ]}
      />

      {selectedWorker ? (
        <PersonListCard
          title={TEXT.REPAIR_COMPUTER_JOB_ASSIGNMENT}
          showCount={false}
          people={[
            {
              key: "worker",
              name: getWorkerName(selectedWorker) || TEXT.REPAIR_COMPUTER_WORKER,
              subtitle:
                getWorkerPosition(selectedWorker) || getWorkerDept(selectedWorker) || TEXT.REPAIR_COMPUTER_WORKER,
              photoStaffId: getWorkerPhotoStaffId(selectedWorker) || getWorkerId(selectedWorker),
            },
          ]}
        />
      ) : null}
    </>
  );

  // ── Root render ─────────────────────────────────────────────────────────────

  const pageTitle =
    step === "repairType" ? TEXT.REPAIR_COMPUTER_SELECT_JOB_TYPE
    : step === "worker"   ? TEXT.REPAIR_COMPUTER_SELECT_WORKER
    : TEXT.REPAIR_COMPUTER_JOB_ASSIGNMENT;

  return (
    <ThemedView style={styles.container}>
      <NavTopBar title={TEXT.REPAIR_COMPUTER_TITLE} onBackPress={handleBackPress} showBackButton />

      <View style={styles.content}>
        <View style={styles.panelHeader}>
          {/* Step progress — a segmented bar with the current step counter. */}
          <View style={styles.stepBar}>
            {(["repairType", "worker", "confirm"] as AssignStep[]).map((s, i) => {
              const stepIndex = { repairType: 0, worker: 1, confirm: 2 }[step];
              const isActive = s === step;
              const isReached = i <= stepIndex;
              const stepLabels: Record<AssignStep, string> = {
                repairType: TEXT.REPAIR_COMPUTER_JOB_TYPE,
                worker: TEXT.REPAIR_COMPUTER_STEP_WORKER,
                confirm: TEXT.SHARED_CONFIRM,
              };
              return (
                <View key={s} style={styles.stepSegment}>
                  <View style={[styles.stepTrack, isReached && styles.stepTrackReached]} />
                  <ThemedText
                    style={[styles.stepSegLabel, isActive && styles.stepSegLabelActive]}
                    numberOfLines={1}
                  >
                    {stepLabels[s]}
                  </ThemedText>
                </View>
              );
            })}
          </View>
          <View style={styles.stepTitleRow}>
            <ThemedText type="subtitle" numberOfLines={1} style={styles.stepTitle}>
              {pageTitle}
            </ThemedText>
            <ThemedText style={styles.stepCounter}>
              {({ repairType: 1, worker: 2, confirm: 3 }[step])}/3
            </ThemedText>
          </View>
        </View>

        <ScrollView
          style={styles.panel}
          contentContainerStyle={styles.form}
          showsVerticalScrollIndicator={false}
        >
          {step === "repairType" && renderRepairTypeStep()}
          {step === "worker"     && renderWorkerStep()}
          {step === "confirm"    && renderConfirmStep()}
        </ScrollView>
      </View>

      {/* Fixed CTA bar */}
      <View style={styles.bottomBar}>
        <Button title={TEXT.SHARED_BACK_THAI} variant="secondary" onPress={handleBackPress} />
        <Button
          title={ctaLabel}
          disabled={ctaDisabled}
          onPress={handleCta}
          style={styles.ctaButton}
        />
      </View>

      <ConfirmDialog
        visible={isConfirmOpen}
        title={TEXT.REPAIR_COMPUTER_ASSIGN_CONFIRM_TITLE}
        message={TEXT.REPAIR_COMPUTER_ASSIGN_CONFIRM_MESSAGE}
        confirmLabel={TEXT.SHARED_CONFIRM}
        cancelLabel={TEXT.CANCEL}
        loading={isSubmitting}
        onConfirm={handleAssign}
        onCancel={() => setIsConfirmOpen(false)}
      />

      <AppToast message={toastMessage} type={toastType === "error" ? "error" : "success"} />

      <SubmittingOverlay visible={isSubmitting} />
    </ThemedView>
  );
}

// ── Styles (mirroring foreman-job-detail tokens) ──────────────────────────────

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  panelHeader: {
    paddingBottom: 12,
    gap: 10,
  },
  stepBar: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
    marginBottom: 6,
  },
  stepSegment: {
    flex: 1,
    gap: 6,
  },
  stepTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: c.surfaceMuted,
  },
  stepTrackReached: {
    backgroundColor: c.primary,
  },
  stepSegLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: c.textMuted,
  },
  stepSegLabelActive: {
    color: c.primary,
    fontWeight: "700",
  },
  stepTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  stepTitle: {
    flex: 1,
  },
  stepCounter: {
    fontSize: 13,
    lineHeight: 18,
    color: c.textMuted,
    fontWeight: "700",
  },
  panel: {
    flex: 1,
  },
  form: {
    gap: 14,
    paddingBottom: 10,
  },

  // ── Summary card (foreman-job-detail style) ─────────────────────────────────
  summaryCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    gap: 14,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  summaryTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  summaryKicker: {
    color: c.primary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
  summaryTitle: {
    marginTop: 3,
    lineHeight: 24,
  },
  stepBadge: {
    maxWidth: 100,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  stepBadgeText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
  },
  summaryMetaGrid: {
    gap: 8,
  },
  summaryMetaItem: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 8,
    backgroundColor: c.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  summaryMetaItemHighlight: {
    backgroundColor: c.primarySoft,
    borderWidth: 1,
    borderColor: "rgba(179,57,57,0.2)",
  },
  summaryMetaText: {
    flex: 1,
    color: c.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  summaryMetaTextHighlight: {
    color: c.primary,
    fontWeight: "600",
  },

  // ── Section card ─────────────────────────────────────────────────────────────
  sectionCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border,
    padding: 14,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    lineHeight: 21,
  },

  // ── Row detail ───────────────────────────────────────────────────────────────
  detailGrid: {
    gap: 12,
  },
  rowDetail: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
    paddingBottom: 10,
  },
  rowTitle: {
    color: c.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  rowDescription: {
    color: c.text,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  descriptionBox: {
    gap: 6,
  },
  longDescription: {
    color: c.text,
    fontSize: 14,
    lineHeight: 21,
  },

  // ── Person card (foreman-job-detail style) ────────────────────────────────────
  personCard: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 8,
    backgroundColor: c.surfaceMuted,
    padding: 12,
  },
  personPhoto: {
    width: 58,
    height: 58,
    borderRadius: 8,
    backgroundColor: c.border,
  },
  personPhotoPlaceholder: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: c.border,
  },
  personPhotoInitial: {
    color: c.primary,
    fontSize: 20,
    lineHeight: 26,
  },
  personText: {
    flex: 1,
    minWidth: 0,
  },
  personName: {
    fontSize: 15,
    lineHeight: 21,
  },
  personRole: {
    color: c.primary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    marginTop: 2,
  },
  personMeta: {
    color: c.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },

  // ── Grouped list container ────────────────────────────────────────────────────
  listGroup: {
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    overflow: "hidden",
  },
  listDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.surfaceMuted,
  },

  // ── Type selection row ────────────────────────────────────────────────────────
  typeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: c.surface,
    paddingHorizontal: 14,
    paddingVertical: 20,
  },
  typeRowSelected: {
    backgroundColor: c.primarySoft,
  },
  typeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: c.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  typeIconBoxSelected: {
    backgroundColor: "#FFE3E3",
  },
  typeName: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: c.text,
  },
  typeNameSelected: {
    color: c.primary,
  },

  // ── Worker selection row ──────────────────────────────────────────────────────
  workerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: c.surface,
    paddingHorizontal: 12,
    paddingVertical: 18,
  },
  workerRowSelected: {
    backgroundColor: c.primarySoft,
  },
  workerPhoto: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: c.border,
    flexShrink: 0,
  },
  workerPhotoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: c.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  workerPhotoInitial: {
    color: c.primary,
    fontSize: 18,
    lineHeight: 24,
  },
  workerText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  workerName: {
    fontSize: 14,
    lineHeight: 20,
    color: c.text,
  },
  workerNameSelected: {
    color: c.primary,
  },
  workerMeta: {
    fontSize: 12,
    lineHeight: 17,
    color: c.textMuted,
  },

  // ── Radio indicator ───────────────────────────────────────────────────────────
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: c.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  radioOuterSelected: {
    borderColor: c.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: c.primary,
  },

  // ── Empty list ────────────────────────────────────────────────────────────────
  emptyMessage: {
    color: c.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    paddingVertical: 8,
  },

  // ── Bottom bar ────────────────────────────────────────────────────────────────
  bottomBar: {
    flexDirection: "row",
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    backgroundColor: c.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    boxShadow: "0 -2px 10px rgba(0,0,0,0.07)",
    elevation: 12,
  },
  ctaButton: {
    flex: 1,
  },

  // ── State: loading / error ────────────────────────────────────────────────────
  stateContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  stateMessage: {
    color: c.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
    textAlign: "center",
  },
  errorText: {
    color: c.primary,
  },
  retryButton: {
    minHeight: 48,
    minWidth: 132,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: c.primary,
    marginTop: 24,
  },
});

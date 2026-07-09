import { router, useLocalSearchParams } from "expo-router";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
    ActivityIndicator,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";

import { AppToast } from "@/components/app-toast";
import { LoadingAnimate } from "@/components/loading-animate";
import { NavTopBar } from "@/components/nav-top-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
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
  return (
    <ThemedView style={styles.sectionCard} lightColor="#FFFFFF" darkColor="#151718">
      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>{title}</ThemedText>
      {children}
    </ThemedView>
  );
}

function RowDetail({ title, description }: { title: string; description: string }) {
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
    step === "repairType" ? "Next: Select Worker"
    : step === "worker"   ? "Next: Review"
    : "Confirm Assignment";

  const ctaDisabled =
    step === "repairType" ? !selectedRepairTypeId
    : step === "worker"   ? !selectedWorker
    : false;

  const handleCta = () => {
    if (step === "repairType") { handleRepairTypeNext(); return; }
    if (step === "worker")     { setStep("confirm"); return; }
    setIsConfirmOpen(true);
  };

  // ── Shared blocks ───────────────────────────────────────────────────────────

  const summaryCard = (
    <ThemedView style={styles.summaryCard} lightColor="#FFFFFF" darkColor="#151718">
      <View style={styles.summaryHeader}>
        <View style={styles.summaryTitleBlock}>
          <ThemedText style={styles.summaryKicker}>
            {TEXT.REPAIR_COMPUTER_JOB_DETAIL}
          </ThemedText>
          <ThemedText type="subtitle" style={styles.summaryTitle}>
            {detail || requesterName || TEXT.REPAIR_COMPUTER_TITLE}
          </ThemedText>
        </View>
        <View style={[styles.stepBadge, { backgroundColor: badgeStyle.background }]}>
          <ThemedText style={[styles.stepBadgeText, { color: badgeStyle.text }]} numberOfLines={1}>
            {getStepBadgeLabel(step)}
          </ThemedText>
        </View>
      </View>

      <View style={styles.summaryMetaGrid}>
        {jobId ? (
          <View style={styles.summaryMetaItem}>
            <IconSymbol name="list.bullet" size={14} color="#584140" />
            <ThemedText style={styles.summaryMetaText} numberOfLines={1}>
              {TEXT.REPAIR_COMPUTER_JOB_ID_LABEL} {jobId}
            </ThemedText>
          </View>
        ) : null}
        {informDateTime ? (
          <View style={styles.summaryMetaItem}>
            <IconSymbol name="calendar" size={14} color="#584140" />
            <ThemedText style={styles.summaryMetaText} numberOfLines={1}>
              {formatDateTime(informDateTime)}
            </ThemedText>
          </View>
        ) : null}
        {step === "worker" && selectedRepairType ? (
          <View style={[styles.summaryMetaItem, styles.summaryMetaItemHighlight]}>
            <IconSymbol
              name={getRepairComputerTypeIcon(selectedRepairTypeId, getRepairTypeName(selectedRepairType))}
              size={14}
              color="#922124"
            />
            <ThemedText style={[styles.summaryMetaText, styles.summaryMetaTextHighlight]} numberOfLines={1}>
              {getRepairTypeName(selectedRepairType)}
            </ThemedText>
          </View>
        ) : null}
      </View>
    </ThemedView>
  );

  const userInformSection = (
    <SectionCard title="User Inform">
      <PersonSummaryCard
        fallbackTitle="User"
        id={requesterId}
        name={requesterName}
        meta={deptName ? `${TEXT.SHARED_DEPARTMENT_LABEL} ${deptName}` : undefined}
      />
      <View style={styles.detailGrid}>
        <RowDetail title={TEXT.REPAIR_COMPUTER_PHONE_LABEL} description={phone || TEXT_NONE} />
        {informDateTime ? (
          <RowDetail
            title={TEXT.REPAIR_COMPUTER_INFORM_DATE_LABEL}
            description={formatDateTime(informDateTime)}
          />
        ) : null}
      </View>
    </SectionCard>
  );

  const jobDetailSection = (
    <SectionCard title={TEXT.REPAIR_COMPUTER_DETAIL}>
      {step === "confirm" && selectedRepairType ? (
        <RowDetail
          title="Job Type"
          description={getRepairTypeName(selectedRepairType)}
        />
      ) : null}
      <RowDetail
        title={TEXT.REPAIR_COMPUTER_SUPPLY_CODE_LABEL}
        description={supplyCode || TEXT_NONE}
      />
      <View style={styles.descriptionBox}>
        <ThemedText style={styles.rowTitle}>{TEXT.REPAIR_COMPUTER_DETAIL_LABEL}</ThemedText>
        <ThemedText style={styles.longDescription}>{detail || TEXT_NONE}</ThemedText>
      </View>
    </SectionCard>
  );

  // ── Loading / error ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <NavTopBar title={TEXT.REPAIR_COMPUTER_TITLE} onBackPress={handleBackPress} showBackButton />
        <View style={styles.stateContent}>
          <LoadingAnimate title="Loading data" desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT} />
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
        <ThemedText style={styles.emptyMessage}>No repair types available</ThemedText>
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
                      color={isSelected ? "#b33939" : "#8A8F9D"}
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
        <ThemedText style={styles.emptyMessage}>No workers available</ThemedText>
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
      {summaryCard}
      {userInformSection}
      {jobDetailSection}

      <SectionCard title={TEXT.REPAIR_COMPUTER_ASSIGN_CONFIRM}>
        {selectedWorker ? (
          <PersonSummaryCard
            fallbackTitle="Worker"
            id={getWorkerPhotoStaffId(selectedWorker) || getWorkerId(selectedWorker)}
            name={getWorkerName(selectedWorker)}
            role="Worker"
            meta={getWorkerPosition(selectedWorker) || getWorkerDept(selectedWorker) || undefined}
          />
        ) : null}
        <View style={styles.detailGrid}>
          <RowDetail
            title={TEXT.REPAIR_COMPUTER_USER_LABEL}
            description={requesterName || TEXT_NONE}
          />
          <RowDetail
            title="Job Type"
            description={selectedRepairType ? getRepairTypeName(selectedRepairType) : TEXT_NONE}
          />
        </View>
      </SectionCard>
    </>
  );

  // ── Root render ─────────────────────────────────────────────────────────────

  const pageTitle =
    step === "repairType" ? "Select Job Type"
    : step === "worker"   ? "Select Worker"
    : TEXT.REPAIR_COMPUTER_ASSIGN_CONFIRM;

  return (
    <ThemedView style={styles.container}>
      <NavTopBar title={TEXT.REPAIR_COMPUTER_TITLE} onBackPress={handleBackPress} showBackButton />

      <View style={styles.content}>
        <View style={styles.panelHeader}>
          {/* Step breadcrumb */}
          <View style={styles.stepBar}>
            {(["repairType", "worker", "confirm"] as AssignStep[]).map((s, i) => {
              const labels: Record<AssignStep, string> = {
                repairType: "Job Type",
                worker: "Worker",
                confirm: "Confirm",
              };
              const stepIndex = { repairType: 0, worker: 1, confirm: 2 }[step];
              const isDone    = i < stepIndex;
              const isActive  = s === step;
              return (
                <Fragment key={s}>
                  {i > 0 && (
                    <View style={[styles.stepConnector, isDone && styles.stepConnectorDone]} />
                  )}
                  <View style={styles.stepItem}>
                    <View style={[
                      styles.stepCircle,
                      isActive && styles.stepCircleActive,
                      isDone   && styles.stepCircleDone,
                    ]}>
                      <ThemedText style={[
                        styles.stepNum,
                        isActive && styles.stepNumActive,
                        isDone   && styles.stepNumDone,
                      ]}>
                        {i + 1}
                      </ThemedText>
                    </View>
                    <ThemedText style={[
                      styles.stepLabel,
                      isActive && styles.stepLabelActive,
                      isDone   && styles.stepLabelDone,
                    ]}>
                      {labels[s]}
                    </ThemedText>
                  </View>
                </Fragment>
              );
            })}
          </View>
          <ThemedText type="subtitle" numberOfLines={1}>{pageTitle}</ThemedText>
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
        <Pressable
          accessibilityRole="button"
          onPress={handleBackPress}
          style={styles.backButton}
        >
          <ThemedText style={styles.backButtonText} type="defaultSemiBold">
            Back
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={ctaDisabled}
          onPress={handleCta}
          style={[styles.ctaButton, ctaDisabled && styles.ctaButtonDisabled]}
        >
          <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
            {ctaLabel}
          </ThemedText>
        </Pressable>
      </View>

      {/* Confirm modal */}
      <Modal
        transparent
        visible={isConfirmOpen}
        animationType="fade"
        onRequestClose={() => setIsConfirmOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setIsConfirmOpen(false)}>
          <Pressable>
            <ThemedView style={styles.confirmModal} lightColor="#FFFFFF" darkColor="#151718">
              <ThemedText type="subtitle">Confirm Assignment</ThemedText>
              <ThemedText style={styles.confirmMessage}>
                Assign this job to the selected worker?
              </ThemedText>
              <View style={styles.confirmActions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={() => setIsConfirmOpen(false)}
                  style={styles.cancelButton}
                >
                  <ThemedText type="defaultSemiBold">Cancel</ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={handleAssign}
                  style={[styles.confirmButton, isSubmitting && styles.disabledButton]}
                >
                  {isSubmitting && <ActivityIndicator color="#FFFFFF" size="small" />}
                  <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
                    {isSubmitting ? "Assigning…" : "Confirm"}
                  </ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>

      <AppToast message={toastMessage} type={toastType === "error" ? "error" : "success"} />
    </ThemedView>
  );
}

// ── Styles (mirroring foreman-job-detail tokens) ──────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FD",
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
    alignItems: "center",
    marginVertical: 10,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepConnector: {
    flex: 1,
    height: 1.5,
    backgroundColor: "#E1E2E6",
    marginHorizontal: 4,
    minWidth: 16,
  },
  stepConnectorDone: {
    backgroundColor: "#922124",
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#E1E2E6",
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleActive: {
    backgroundColor: "#b33939",
  },
  stepCircleDone: {
    backgroundColor: "#922124",
  },
  stepNum: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8A8F9D",
  },
  stepNumActive: {
    color: "#FFFFFF",
  },
  stepNumDone: {
    color: "#FFFFFF",
  },
  stepLabel: {
    fontSize: 12,
    color: "#8A8F9D",
  },
  stepLabelActive: {
    color: "#b33939",
    fontWeight: "600",
  },
  stepLabelDone: {
    color: "#922124",
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
    borderColor: "#E1E2E6",
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
    color: "#922124",
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
    backgroundColor: "#F2F3F7",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  summaryMetaItemHighlight: {
    backgroundColor: "#FFF3F3",
    borderWidth: 1,
    borderColor: "rgba(179,57,57,0.2)",
  },
  summaryMetaText: {
    flex: 1,
    color: "#584140",
    fontSize: 13,
    lineHeight: 18,
  },
  summaryMetaTextHighlight: {
    color: "#922124",
    fontWeight: "600",
  },

  // ── Section card ─────────────────────────────────────────────────────────────
  sectionCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E1E2E6",
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
    borderBottomColor: "#E1E2E6",
    paddingBottom: 10,
  },
  rowTitle: {
    color: "#584140",
    fontSize: 12,
    lineHeight: 16,
  },
  rowDescription: {
    color: "#191C1F",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  descriptionBox: {
    gap: 6,
  },
  longDescription: {
    color: "#191C1F",
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
    backgroundColor: "#F2F3F7",
    padding: 12,
  },
  personPhoto: {
    width: 58,
    height: 58,
    borderRadius: 8,
    backgroundColor: "#EDEEF2",
  },
  personPhotoPlaceholder: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#EDEEF2",
  },
  personPhotoInitial: {
    color: "#922124",
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
    color: "#922124",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    marginTop: 2,
  },
  personMeta: {
    color: "#584140",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },

  // ── Grouped list container ────────────────────────────────────────────────────
  listGroup: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E1E2E6",
    overflow: "hidden",
  },
  listDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E1E2E6",
  },

  // ── Type selection row ────────────────────────────────────────────────────────
  typeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  typeRowSelected: {
    backgroundColor: "#FFF3F3",
  },
  typeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#F2F3F7",
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
    color: "#191C1F",
  },
  typeNameSelected: {
    color: "#b33939",
  },

  // ── Worker selection row ──────────────────────────────────────────────────────
  workerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    padding: 12,
  },
  workerRowSelected: {
    backgroundColor: "#FFF3F3",
  },
  workerPhoto: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#EDEEF2",
    flexShrink: 0,
  },
  workerPhotoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#EDEEF2",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  workerPhotoInitial: {
    color: "#922124",
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
    color: "#191C1F",
  },
  workerNameSelected: {
    color: "#b33939",
  },
  workerMeta: {
    fontSize: 12,
    lineHeight: 17,
    color: "#584140",
  },

  // ── Radio indicator ───────────────────────────────────────────────────────────
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#BFC4CD",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  radioOuterSelected: {
    borderColor: "#b33939",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#b33939",
  },

  // ── Empty list ────────────────────────────────────────────────────────────────
  emptyMessage: {
    color: "#584140",
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
    borderTopColor: "#E1E2E6",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    boxShadow: "0 -2px 10px rgba(0,0,0,0.07)",
    elevation: 12,
  },
  backButton: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#E1E2E6",
    paddingHorizontal: 20,
  },
  backButtonText: {
    color: "#584140",
    fontSize: 14,
  },
  ctaButton: {
    flex: 1,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#b33939",
  },
  ctaButtonDisabled: {
    opacity: 0.45,
  },

  // ── State: loading / error ────────────────────────────────────────────────────
  stateContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  stateMessage: {
    color: "#584140",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
    textAlign: "center",
  },
  errorText: {
    color: "#BA1A1A",
  },
  retryButton: {
    minHeight: 48,
    minWidth: 132,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#b33939",
    marginTop: 24,
  },

  // ── Confirm modal ─────────────────────────────────────────────────────────────
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17, 24, 28, 0.45)",
    padding: 24,
  },
  confirmModal: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 8,
    padding: 18,
  },
  confirmMessage: {
    color: "#584140",
    lineHeight: 20,
    marginTop: 10,
  },
  confirmActions: {
    flexDirection: "row-reverse",
    gap: 12,
    marginTop: 18,
  },
  cancelButton: {
    minHeight: 46,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E1E2E6",
    backgroundColor: "#FFFFFF",
  },
  confirmButton: {
    minHeight: 46,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#b33939",
  },
  disabledButton: {
    opacity: 0.65,
  },
});

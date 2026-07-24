import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { type AppColors, useThemedStyles } from '@/constants/theme';

import { AppToast } from "@/components/app-toast";
import { SubmittingOverlay } from "@/components/submitting-overlay";
import { LoadingAnimate } from "@/components/loading-animate";
import { NavTopBar } from "@/components/nav-top-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button, ConfirmDialog } from "@/components/ui";
import { TEXT } from "@/constants/text";
import { USER_ID } from "@/constants/user";
import { useAuth } from "@/context/AuthContext";
import type { Person } from "@/models/types";
import { getPersonPhoto } from "@/services/personService";
import {
    foremanForwardForeman,
    getRepairComputerForemen,
} from "@/services/repairComputerService";

// Shown when a person's photo can't be loaded (or there's no staff id).
const USER_PLACEHOLDER = require("../../assets/images/user-placeholder.jpg");

function getValue(row: Person | null | undefined, fields: string[]) {
  if (!row) return "";
  for (const field of fields) {
    const value = row[field];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function normalizeNumericStaffId(staffId: string) {
  return /^\d+$/.test(staffId) ? staffId.padStart(7, "0") : staffId;
}

// A foreman is a division: division_id is the value used when forwarding.
function getForemanDivisionId(foreman: Person) {
  return getValue(foreman, ["division_id", "divisionId", "id"]);
}

function getForemanPhotoStaffId(foreman: Person) {
  return normalizeNumericStaffId(
    getValue(foreman, ["uni_staff_id", "uniStaffId", "UNI_STAFF_ID", "staff_id", "staffId"]),
  );
}

function getForemanName(foreman: Person) {
  const prefix = getValue(foreman, ["prefix_name_th", "prefixNameTH", "PREFIX_TH"]);
  const first = getValue(foreman, ["first_name_th", "firstNameTH", "FMAN_FNAME_TH"]);
  const last = getValue(foreman, ["last_name_th", "lastNameTH", "FMAN_SNAME_TH"]);
  const name = [prefix, first, last].filter(Boolean).join(" ").trim();
  return name || getValue(foreman, ["division_name", "divisionName"]) || "หัวหน้างาน";
}

function getForemanDivisionName(foreman: Person) {
  return getValue(foreman, ["division_name", "divisionName"]);
}

function ForemanSelectRow({
  foreman,
  isSelected,
  onPress,
}: {
  foreman: Person;
  isSelected: boolean;
  onPress: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const photoId = getForemanPhotoStaffId(foreman);
  const name = getForemanName(foreman);
  const division = getForemanDivisionName(foreman);
  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = Boolean(photoId) && !photoFailed;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.foremanRow, isSelected && styles.foremanRowSelected]}
    >
      {showPhoto ? (
        <Image
          onError={() => setPhotoFailed(true)}
          source={{ uri: getPersonPhoto({ ...foreman, staffId: photoId }) }}
          style={styles.foremanPhoto}
        />
      ) : (
        <Image source={USER_PLACEHOLDER} style={styles.foremanPhoto} />
      )}
      <View style={styles.foremanText}>
        <ThemedText
          type="defaultSemiBold"
          style={[styles.foremanName, isSelected && styles.foremanNameSelected]}
          numberOfLines={2}
        >
          {name}
        </ThemedText>
        {division ? (
          <ThemedText style={styles.foremanMeta} numberOfLines={1}>
            {division}
          </ThemedText>
        ) : null}
      </View>
      <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
        {isSelected && <View style={styles.radioDot} />}
      </View>
    </Pressable>
  );
}

export default function SelectForemanScreen() {
  const styles = useThemedStyles(makeStyles);
  const params = useLocalSearchParams<{
    backHref?: string | string[];
    id?: string | string[];
  }>();
  const jobId = Array.isArray(params.id) ? params.id[0] : params.id;
  const backHrefParam = Array.isArray(params.backHref) ? params.backHref[0] : params.backHref;
  const backHref = backHrefParam || "/repair-computer/manage-job";

  const { user: authUser } = useAuth();
  // The current foreman can't forward a job to themselves — hide them from the list.
  const currentStaffId = normalizeNumericStaffId(String(authUser?.staffId || USER_ID || ""));

  const [foremen, setForemen] = useState<Person[]>([]);
  const [selectedForeman, setSelectedForeman] = useState<Person | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "">("");

  const selectedDivisionId = selectedForeman ? getForemanDivisionId(selectedForeman) : "";

  const visibleForemen = foremen.filter(
    (foreman) => !currentStaffId || getForemanPhotoStaffId(foreman) !== currentStaffId,
  );

  const loadForemen = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await getRepairComputerForemen();
      setForemen(result.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : TEXT.REPAIR_COMPUTER_UNABLE_TO_UPDATE_JOB,
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadForemen();
  }, [loadForemen]);

  const handleBackPress = () => {
    // Return to the job detail this screen was opened from, keeping the original
    // backHref so the detail's own back button still returns to the list.
    if (jobId) {
      router.replace({
        pathname: "/repair-computer/foreman-job-detail",
        params: { id: jobId, readonly: "true", backHref },
      } as Parameters<typeof router.replace>[0]);
      return;
    }
    router.replace(backHref as Parameters<typeof router.replace>[0]);
  };

  const handleForward = async () => {
    if (!jobId || !selectedDivisionId || isSubmitting) return;
    setIsSubmitting(true);
    setToastMessage("");
    setToastType("");
    try {
      const result = await foremanForwardForeman(jobId, selectedDivisionId);
      setToastType("success");
      setToastMessage(
        result.message || TEXT.REPAIR_COMPUTER_JOB_UPDATED_SUCCESS_MESSAGE,
      );
      setTimeout(() => {
        router.replace(backHref as Parameters<typeof router.replace>[0]);
      }, 1500);
    } catch (forwardError) {
      setToastType("error");
      setToastMessage(
        forwardError instanceof Error
          ? forwardError.message
          : TEXT.REPAIR_COMPUTER_UNABLE_TO_UPDATE_JOB,
      );
    } finally {
      setIsSubmitting(false);
      setIsConfirmOpen(false);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <LoadingAnimate title={TEXT.SHARED_LOADING_DATA_TITLE} desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT} />
      );
    }

    if (error) {
      return (
        <View style={styles.stateContent}>
          <ThemedText type="subtitle">{TEXT.SHARED_SOMETHING_WENT_WRONG}</ThemedText>
          <ThemedText style={[styles.stateMessage, styles.errorText]}>{error}</ThemedText>
          <Button title={TEXT.SHARED_RETRY} onPress={loadForemen} style={styles.retryButton} />
        </View>
      );
    }

    if (visibleForemen.length === 0) {
      return <ThemedText style={styles.emptyMessage}>{TEXT.REPAIR_COMPUTER_NO_FOREMAN}</ThemedText>;
    }

    return (
      <ScrollView
        style={styles.panel}
        contentContainerStyle={styles.form}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.listGroup}>
          {visibleForemen.map((item, index) => {
            const divisionId = getForemanDivisionId(item);
            const isSelected =
              selectedForeman === item ||
              (Boolean(divisionId) && selectedDivisionId === divisionId);
            return (
              <View key={divisionId || `foreman-${index}`}>
                {index > 0 && <View style={styles.listDivider} />}
                <ForemanSelectRow
                  foreman={item}
                  isSelected={isSelected}
                  onPress={() => setSelectedForeman(item)}
                />
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <NavTopBar
        title={TEXT.REPAIR_COMPUTER_TITLE}
        onBackPress={handleBackPress}
        showBackButton
      />

      <View style={styles.content}>
        {renderContent()}
      </View>

      {!isLoading && !error && visibleForemen.length > 0 ? (
        <View style={styles.bottomBar}>
          <Button title={TEXT.SHARED_BACK_THAI} variant="secondary" onPress={handleBackPress} />
          <Button
            title={TEXT.REPAIR_COMPUTER_FORWARD_FOREMAN}
            disabled={!selectedForeman}
            onPress={() => setIsConfirmOpen(true)}
            style={styles.ctaButton}
          />
        </View>
      ) : null}

      <ConfirmDialog
        visible={isConfirmOpen}
        title={TEXT.REPAIR_COMPUTER_FORWARD_CONFIRM_TITLE}
        message={
          selectedForeman
            ? `${TEXT.REPAIR_COMPUTER_FORWARD_TO_PREFIX}${getForemanName(selectedForeman)}${TEXT.REPAIR_COMPUTER_CONFIRM_QUESTION_SUFFIX}`
            : TEXT.REPAIR_COMPUTER_FORWARD_CONFIRM_MESSAGE
        }
        confirmLabel={TEXT.SHARED_CONFIRM}
        cancelLabel={TEXT.CANCEL}
        loading={isSubmitting}
        onConfirm={handleForward}
        onCancel={() => setIsConfirmOpen(false)}
      />

      <AppToast message={toastMessage} type={toastType === "error" ? "error" : "success"} />
      <SubmittingOverlay visible={isSubmitting} />
    </ThemedView>
  );
}

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
  },
  panel: {
    flex: 1,
  },
  form: {
    gap: 14,
    paddingBottom: 10,
  },
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
  foremanRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: c.surface,
    padding: 12,
  },
  foremanRowSelected: {
    backgroundColor: c.primarySoft,
  },
  foremanPhoto: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: c.border,
    flexShrink: 0,
  },
  foremanText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  foremanName: {
    fontSize: 14,
    lineHeight: 20,
    color: c.text,
  },
  foremanNameSelected: {
    color: c.primary,
  },
  foremanMeta: {
    fontSize: 12,
    lineHeight: 17,
    color: c.textMuted,
  },
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
  emptyMessage: {
    color: c.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    paddingVertical: 8,
  },
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
    minWidth: 132,
    marginTop: 24,
  },
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
});

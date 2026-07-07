import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
        <LoadingAnimate title="Loading data" desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT} />
      );
    }

    if (error) {
      return (
        <View style={styles.stateContent}>
          <ThemedText type="subtitle">{TEXT.SHARED_SOMETHING_WENT_WRONG}</ThemedText>
          <ThemedText style={[styles.stateMessage, styles.errorText]}>{error}</ThemedText>
          <Pressable accessibilityRole="button" onPress={loadForemen} style={styles.retryButton}>
            <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
              {TEXT.SHARED_RETRY}
            </ThemedText>
          </Pressable>
        </View>
      );
    }

    if (visibleForemen.length === 0) {
      return <ThemedText style={styles.emptyMessage}>No foreman available</ThemedText>;
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
        subtitle={jobId ? `${TEXT.REPAIR_COMPUTER_JOB_ID_LABEL} ${jobId}` : undefined}
        moduleIcon="laptop"
        onBackPress={handleBackPress}
        showBackButton
      />

      <View style={styles.content}>
        <View style={styles.panelHeader}>
          <ThemedText type="subtitle" numberOfLines={1}>
            Select Foreman
          </ThemedText>
        </View>
        {renderContent()}
      </View>

      {!isLoading && !error && visibleForemen.length > 0 ? (
        <View style={styles.bottomBar}>
          <Pressable accessibilityRole="button" onPress={handleBackPress} style={styles.backButton}>
            <ThemedText style={styles.backButtonText} type="defaultSemiBold">
              Back
            </ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={!selectedForeman}
            onPress={() => setIsConfirmOpen(true)}
            style={[styles.ctaButton, !selectedForeman && styles.ctaButtonDisabled]}
          >
            <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
              Forward Foreman
            </ThemedText>
          </Pressable>
        </View>
      ) : null}

      <Modal
        transparent
        visible={isConfirmOpen}
        animationType="fade"
        onRequestClose={() => setIsConfirmOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setIsConfirmOpen(false)}>
          <Pressable>
            <ThemedView style={styles.confirmModal} lightColor="#FFFFFF" darkColor="#151718">
              <ThemedText type="subtitle">Confirm Forward Foreman</ThemedText>
              <ThemedText style={styles.confirmMessage}>
                {selectedForeman
                  ? `Forward this job to ${getForemanName(selectedForeman)}?`
                  : "Forward this job to the selected foreman?"}
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
                  onPress={handleForward}
                  style={[styles.confirmButton, isSubmitting && styles.disabledButton]}
                >
                  {isSubmitting && <ActivityIndicator color="#FFFFFF" size="small" />}
                  <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
                    {isSubmitting ? "Forwarding…" : "Confirm"}
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
  },
  panel: {
    flex: 1,
  },
  form: {
    gap: 14,
    paddingBottom: 10,
  },
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
  foremanRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    padding: 12,
  },
  foremanRowSelected: {
    backgroundColor: "#FFF3F3",
  },
  foremanPhoto: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#EDEEF2",
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
    color: "#191C1F",
  },
  foremanNameSelected: {
    color: "#b33939",
  },
  foremanMeta: {
    fontSize: 12,
    lineHeight: 17,
    color: "#584140",
  },
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
  emptyMessage: {
    color: "#584140",
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
    flexDirection: "row",
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

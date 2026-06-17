import { TEXT } from "@/constants/text";
import { router, useFocusEffect } from "expo-router";
import { navReplace } from "@/utils/navigation";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from "react-native";

import { AppToast } from "@/components/app-toast";
import { LoadingAnimate } from "@/components/loading-animate";
import { NavTopBar } from "@/components/nav-top-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { AppFonts } from "@/constants/fonts";
import { USER_ID } from "@/constants/user";
import { useAuth } from "@/context/AuthContext";
import {
    addRepairComputerJob,
    checkCanInform,
} from "@/services/repairComputerService";

type ValidationErrors = Partial<Record<"detail" | "phone", string>>;

function getCanInform(data: unknown) {
  if (typeof data === "boolean") {
    return data;
  }

  if (data && typeof data === "object") {
    const canInformData = data as Record<string, unknown>;
    const canInform =
      canInformData.canInform ?? canInformData.can_inform ?? canInformData.can;

    if (typeof canInform === "boolean") {
      return canInform;
    }
  }

  return true;
}

export default function RepairComputerInformScreen() {
  const { user: authUser } = useAuth();
  const staffId = authUser?.staffId || USER_ID;
  const [detail, setDetail] = useState("");
  const [supplyCode, setSupplyCode] = useState("");
  const [phone, setPhone] = useState("");
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {},
  );
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "">("");
  const [isCheckingCanInform, setIsCheckingCanInform] = useState(true);
  const [canInform, setCanInform] = useState(false);
  const [canInformMessage, setCanInformMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadCanInform() {
        setIsCheckingCanInform(true);
        setToastMessage("");
        setToastType("");

        try {
          const result = await checkCanInform(staffId);

          if (!isActive) {
            return;
          }

          const isAllowed = getCanInform(result);
          setCanInform(isAllowed);
          setCanInformMessage(
            isAllowed ? "" : "You still have a repair computer job remain.",
          );
        } catch (error) {
          if (!isActive) {
            return;
          }

          setCanInform(false);
          setCanInformMessage(
            error instanceof Error
              ? error.message
              : "You still have a repair computer job remain.",
          );
        } finally {
          if (isActive) {
            setIsCheckingCanInform(false);
          }
        }
      }

      loadCanInform();

      return () => {
        isActive = false;
      };
    }, [staffId]),
  );

  const clearValidationError = (field: keyof ValidationErrors) => {
    setValidationErrors((currentErrors) => {
      if (!currentErrors[field]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
  };

  const handleSubmit = () => {
    if (isSubmitting) {
      return;
    }

    const nextErrors: ValidationErrors = {};

    if (!detail.trim()) {
      nextErrors.detail = "Detail is required";
    }

    if (!phone.trim()) {
      nextErrors.phone = "Phone is required";
    }

    setValidationErrors(nextErrors);
    setToastMessage("");
    setToastType("");

    if (Object.keys(nextErrors).length) {
      return;
    }

    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    setIsSubmitting(true);

    try {
      const result = await addRepairComputerJob({
        staff_id: staffId,
        phone: phone.trim(),
        supply_code: supplyCode.trim(),
        detail: detail.trim(),
      });

      setToastType("success");
      setToastMessage(
        result.message ||
          TEXT.REPAIR_COMPUTER_REQUEST_SUBMITTED_SUCCESS_MESSAGE,
      );
      setDetail("");
      setSupplyCode("");
      setPhone("");
      setTimeout(() => {
        router.replace("/repair-computer/current-job");
      }, 1500);
    } catch (error) {
      setToastType("error");
      setToastMessage(
        error instanceof Error
          ? error.message
          : TEXT.REPAIR_COMPUTER_UNABLE_TO_SUBMIT_REQUEST,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <NavTopBar
        title={TEXT.REPAIR_COMPUTER_TITLE}
        backHref="/repair-computer/current-job"
      />

      {isCheckingCanInform ? (
        <LoadingAnimate
          title={TEXT.REPAIR_COMPUTER_CHECKING_REQUEST}
          desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT}
        />
      ) : canInform ? (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <ThemedText type="subtitle">{TEXT.REPAIR_COMPUTER_INFORM}</ThemedText>

          <View style={styles.formCard}>
            <View style={styles.field}>
              <ThemedText type="defaultSemiBold">
                {TEXT.REPAIR_COMPUTER_DETAIL}
              </ThemedText>
              <TextInput
                multiline
                numberOfLines={2}
                onChangeText={(value) => {
                  setDetail(value);
                  clearValidationError("detail");
                }}
                placeholder={TEXT.REPAIR_COMPUTER_DETAIL}
                placeholderTextColor="#8A969C"
                style={[
                  styles.input,
                  styles.textArea,
                  validationErrors.detail ? styles.inputError : undefined,
                ]}
                textAlignVertical="top"
                value={detail}
              />
              {validationErrors.detail ? (
                <ThemedText style={styles.fieldError}>
                  {validationErrors.detail}
                </ThemedText>
              ) : null}
            </View>

            <View style={styles.field}>
              <ThemedText type="defaultSemiBold">
                {TEXT.REPAIR_COMPUTER_SUPPLY_CODE}
              </ThemedText>
              <TextInput
                onChangeText={setSupplyCode}
                placeholder={TEXT.REPAIR_COMPUTER_SUPPLY_CODE}
                placeholderTextColor="#8A969C"
                style={styles.input}
                value={supplyCode}
              />
            </View>

            <View style={styles.field}>
              <ThemedText type="defaultSemiBold">
                {TEXT.REPAIR_COMPUTER_PHONE}
              </ThemedText>
              <TextInput
                keyboardType="phone-pad"
                onChangeText={(value) => {
                  setPhone(value);
                  clearValidationError("phone");
                }}
                placeholder={TEXT.REPAIR_COMPUTER_PHONE}
                placeholderTextColor="#8A969C"
                style={[
                  styles.input,
                  validationErrors.phone ? styles.inputError : undefined,
                ]}
                value={phone}
              />
              {validationErrors.phone ? (
                <ThemedText style={styles.fieldError}>
                  {validationErrors.phone}
                </ThemedText>
              ) : null}
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={isSubmitting}
            onPress={handleSubmit}
            style={[
              styles.submitButton,
              isSubmitting ? styles.disabledButton : undefined,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : null}
            <ThemedText
              lightColor="#FFFFFF"
              darkColor="#FFFFFF"
              type="defaultSemiBold"
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </ThemedText>
          </Pressable>
        </ScrollView>
      ) : (
        <View style={styles.content}>
          <ThemedView
            style={styles.messagePanel}
            lightColor="#FFFFFF"
            darkColor="#1F2B30"
          >
            <ThemedText type="subtitle">
              {TEXT.REPAIR_COMPUTER_CANNOT_INFORM_JOB}
            </ThemedText>
            <ThemedText style={styles.messageText}>
              {canInformMessage ||
                "You still have a repair computer job remain."}
            </ThemedText>
          </ThemedView>

          <Pressable
            accessibilityRole="button"
            onPress={() => navReplace("/repair-computer/current-job")}
            style={styles.secondaryButton}
          >
            <ThemedText
              lightColor="#0A6E8A"
              darkColor="#0A6E8A"
              type="defaultSemiBold"
            >
              {TEXT.REPAIR_COMPUTER_BACK_TO_CURRENT_JOB}
            </ThemedText>
          </Pressable>
        </View>
      )}

      <Modal
        transparent
        visible={showConfirm}
        animationType="fade"
        onRequestClose={() => setShowConfirm(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setShowConfirm(false)}
        >
          <Pressable>
            <ThemedView
              style={styles.confirmModal}
              lightColor="#FFFFFF"
              darkColor="#151718"
            >
              <ThemedText type="subtitle">
                {TEXT.REPAIR_COMPUTER_INFORM}
              </ThemedText>
              <ThemedText style={styles.confirmMessage}>
                Are you sure you want to submit this repair computer request?
              </ThemedText>

              <View style={styles.confirmActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setShowConfirm(false)}
                  style={styles.cancelButton}
                >
                  <ThemedText type="defaultSemiBold">{TEXT.CANCEL}</ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleConfirm}
                  style={styles.confirmSubmitButton}
                >
                  <ThemedText
                    lightColor="#FFFFFF"
                    darkColor="#FFFFFF"
                    type="defaultSemiBold"
                  >
                    Confirm
                  </ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>

      <AppToast
        message={toastMessage}
        type={toastType === "error" ? "error" : "success"}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FD',
  },
  content: {
    gap: 16,
    padding: 16,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1E2E6',
    padding: 16,
    gap: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  field: {
    gap: 8,
  },
  messagePanel: {
    borderRadius: 8,
    padding: 16,
  },
  messageText: {
    color: "#687076",
    lineHeight: 20,
    marginTop: 10,
  },
  input: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#BFD2DA",
    backgroundColor: "#FFFFFF",
    color: "#11181C",
    fontFamily: AppFonts.psuRegular,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  textArea: {
    minHeight: 76,
  },
  inputError: {
    borderColor: "#C44D58",
  },
  fieldError: {
    color: "#C44D58",
    fontSize: 13,
    lineHeight: 18,
  },
  submitButton: {
    minHeight: 48,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#0A6E8A",
    paddingHorizontal: 18,
  },
  disabledButton: {
    opacity: 0.65,
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#0A6E8A",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
  },
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    padding: 24,
  },
  confirmModal: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 8,
    padding: 18,
  },
  confirmMessage: {
    color: "#687076",
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
    borderColor: "#BFD2DA",
    backgroundColor: "#FFFFFF",
  },
  confirmSubmitButton: {
    minHeight: 46,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#0A6E8A",
  },
});

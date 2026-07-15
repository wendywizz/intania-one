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
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

import { AppToast } from "@/components/app-toast";
import { FloatingActionBar } from "@/components/floating-action-bar";
import { LoadingAnimate } from "@/components/loading-animate";
import { NavTopBar } from "@/components/nav-top-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
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
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
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
        title={TEXT.REPAIR_COMPUTER_INFORM}
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
          <View style={styles.heading}>
            <ThemedText type="subtitle">
              {TEXT.REPAIR_COMPUTER_NEW_REQUEST}
            </ThemedText>
            <ThemedText style={styles.headingDescription}>
              {TEXT.REPAIR_COMPUTER_NEW_REQUEST_DESCRIPTION}
            </ThemedText>
          </View>

          <View style={styles.formCard}>
            <View style={styles.field}>
              <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>
                {TEXT.REPAIR_COMPUTER_DETAIL}
              </ThemedText>
              <TextInput
                multiline
                numberOfLines={4}
                onChangeText={(value) => {
                  setDetail(value);
                  clearValidationError("detail");
                }}
                placeholder="Describe the problem in detail..."
                placeholderTextColor="#AEBFC9"
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

            <View style={styles.fieldDivider} />

            <View style={styles.field}>
              <View style={styles.fieldLabelRow}>
                <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>
                  {TEXT.REPAIR_COMPUTER_SUPPLY_CODE}
                </ThemedText>
                <ThemedText style={styles.optionalLabel}>
                  {TEXT.REPAIR_COMPUTER_OPTIONAL}
                </ThemedText>
              </View>
              <TextInput
                onChangeText={setSupplyCode}
                placeholder="e.g. PC-12345"
                placeholderTextColor="#AEBFC9"
                style={styles.input}
                value={supplyCode}
              />
            </View>

            <View style={styles.fieldDivider} />

            <View style={styles.field}>
              <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>
                {TEXT.REPAIR_COMPUTER_PHONE}
              </ThemedText>
              <TextInput
                keyboardType="phone-pad"
                onChangeText={(value) => {
                  setPhone(value);
                  clearValidationError("phone");
                }}
                placeholder="+66 (0)00 000-0000"
                placeholderTextColor="#AEBFC9"
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
              lightColor="#b33939"
              darkColor="#b33939"
              type="defaultSemiBold"
            >
              {TEXT.REPAIR_COMPUTER_BACK_TO_CURRENT_JOB}
            </ThemedText>
          </Pressable>
        </View>
      )}

      {!isCheckingCanInform && canInform ? (
        <FloatingActionBar disabled={isSubmitting}>
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
            ) : (
              <IconSymbol name="paperplane.fill" size={18} color="#FFFFFF" />
            )}
            <ThemedText
              lightColor="#FFFFFF"
              darkColor="#FFFFFF"
              type="defaultSemiBold"
              style={styles.submitButtonText}
            >
              {isSubmitting ? "Submitting..." : TEXT.REPAIR_COMPUTER_SUBMIT_REQUEST}
            </ThemedText>
          </Pressable>
        </FloatingActionBar>
      ) : null}

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

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  content: {
    gap: 20,
    padding: 16,
    paddingBottom: 32,
  },
  heading: {
    gap: 6,
  },
  headingDescription: {
    color: c.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  formCard: {
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  field: {
    gap: 10,
    padding: 16,
  },
  fieldDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.surfaceMuted,
    marginHorizontal: 16,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    lineHeight: 20,
  },
  optionalLabel: {
    color: c.textFaint,
    fontSize: 12,
    lineHeight: 18,
  },
  input: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.surfaceMuted,
    color: c.text,
    fontFamily: AppFonts.psuRegular,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  textArea: {
    minHeight: 96,
  },
  inputError: {
    borderColor: c.primary,
  },
  fieldError: {
    color: c.primary,
    fontSize: 12,
    lineHeight: 17,
  },
  submitButton: {
    minHeight: 52,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
    backgroundColor: c.primary,
    paddingHorizontal: 24,
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    fontSize: 15,
    lineHeight: 20,
  },
  disabledButton: {
    opacity: 0.65,
  },
  messagePanel: {
    borderRadius: 12,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    gap: 8,
  },
  messageText: {
    color: c.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.primary,
    backgroundColor: c.surface,
    paddingHorizontal: 18,
  },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17, 24, 28, 0.45)',
    padding: 24,
  },
  confirmModal: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 8,
    padding: 18,
  },
  confirmMessage: {
    color: c.textMuted,
    lineHeight: 20,
    marginTop: 10,
  },
  confirmActions: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginTop: 18,
  },
  cancelButton: {
    minHeight: 46,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  confirmSubmitButton: {
    minHeight: 46,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: c.primary,
  },
});

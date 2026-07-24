import { TEXT } from "@/constants/text";
import { router, useFocusEffect } from "expo-router";
import { navReplace } from "@/utils/navigation";
import { useCallback, useState } from "react";
import {
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

import { AppToast } from "@/components/app-toast";
import { SubmittingOverlay } from "@/components/submitting-overlay";
import { FloatingActionBar } from "@/components/floating-action-bar";
import { LoadingAnimate } from "@/components/loading-animate";
import { NavTopBar } from "@/components/nav-top-bar";
import { SectionCard } from "@/components/section-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button, ConfirmDialog } from "@/components/ui";
import { TipAlert } from "@/components/ui/tip-alert";
import { AppFonts } from "@/constants/fonts";
import { USER_ID } from "@/constants/user";
import { useAuth } from "@/context/AuthContext";

// Remove the default focus outline on web so active inputs match the
// borderless underline style (RN Web only; no-op on native).
const webNoOutline: any = Platform.OS === "web" ? { outlineStyle: "none" } : null;
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
            isAllowed ? "" : TEXT.REPAIR_COMPUTER_JOB_REMAIN_MESSAGE,
          );
        } catch (error) {
          if (!isActive) {
            return;
          }

          setCanInform(false);
          setCanInformMessage(
            error instanceof Error
              ? error.message
              : TEXT.REPAIR_COMPUTER_JOB_REMAIN_MESSAGE,
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
      nextErrors.detail = TEXT.REPAIR_COMPUTER_DETAIL_REQUIRED;
    }

    if (!phone.trim()) {
      nextErrors.phone = TEXT.REPAIR_COMPUTER_PHONE_REQUIRED;
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
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <TipAlert
            title={TEXT.REPAIR_COMPUTER_NEW_REQUEST}
            message={TEXT.REPAIR_COMPUTER_NEW_REQUEST_DESCRIPTION}
            style={styles.policyCard}
          />

          {/* Detail */}
          <SectionCard>
            <View style={styles.field}>
              <ThemedText style={styles.fieldLabel}>
                {TEXT.REPAIR_COMPUTER_DETAIL}
                <ThemedText style={styles.requiredMark}> *</ThemedText>
              </ThemedText>
              <TextInput
                multiline
                numberOfLines={2}
                value={detail}
                onChangeText={(value) => {
                  setDetail(value);
                  clearValidationError("detail");
                }}
                placeholder={TEXT.REPAIR_COMPUTER_DETAIL_PLACEHOLDER}
                placeholderTextColor={c.textFaint}
                style={[
                  styles.input,
                  styles.textArea,
                  validationErrors.detail ? styles.inputError : undefined,
                  webNoOutline,
                ]}
              />
              {validationErrors.detail ? (
                <ThemedText style={styles.fieldError}>
                  {validationErrors.detail}
                </ThemedText>
              ) : null}
            </View>
          </SectionCard>

          {/* Supply code */}
          <SectionCard>
            <View style={styles.field}>
              <ThemedText style={styles.fieldLabel}>
                {TEXT.REPAIR_COMPUTER_SUPPLY_CODE}
                <ThemedText style={styles.optionalMark}>
                  {" "}
                  {TEXT.REPAIR_COMPUTER_OPTIONAL}
                </ThemedText>
              </ThemedText>
              <TextInput
                value={supplyCode}
                onChangeText={setSupplyCode}
                placeholder={TEXT.REPAIR_COMPUTER_SUPPLY_CODE_PLACEHOLDER}
                placeholderTextColor={c.textFaint}
                style={[styles.input, webNoOutline]}
              />
            </View>
          </SectionCard>

          {/* Phone */}
          <SectionCard>
            <View style={styles.field}>
              <ThemedText style={styles.fieldLabel}>
                {TEXT.REPAIR_COMPUTER_PHONE}
                <ThemedText style={styles.requiredMark}> *</ThemedText>
              </ThemedText>
              <TextInput
                keyboardType="phone-pad"
                value={phone}
                onChangeText={(value) => {
                  setPhone(value);
                  clearValidationError("phone");
                }}
                placeholder={TEXT.REPAIR_COMPUTER_PHONE_PLACEHOLDER}
                placeholderTextColor={c.textFaint}
                style={[
                  styles.input,
                  validationErrors.phone ? styles.inputError : undefined,
                  webNoOutline,
                ]}
              />
              {validationErrors.phone ? (
                <ThemedText style={styles.fieldError}>
                  {validationErrors.phone}
                </ThemedText>
              ) : null}
            </View>
          </SectionCard>
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

          <Button
            title={TEXT.REPAIR_COMPUTER_BACK_TO_CURRENT_JOB}
            variant="secondary"
            fullWidth
            onPress={() => navReplace("/repair-computer/current-job")}
          />
        </View>
      )}

      {!isCheckingCanInform && canInform ? (
        <FloatingActionBar disabled={isSubmitting}>
          <Button
            title={TEXT.REPAIR_COMPUTER_SUBMIT_REQUEST}
            icon="paperplane.fill"
            size="lg"
            fullWidth
            loading={isSubmitting}
            onPress={handleSubmit}
          />
        </FloatingActionBar>
      ) : null}

      <ConfirmDialog
        visible={showConfirm}
        title={TEXT.REPAIR_COMPUTER_NEW_REQUEST}
        message={TEXT.REPAIR_COMPUTER_SUBMIT_CONFIRM_MESSAGE}
        confirmLabel={TEXT.REPAIR_COMPUTER_SUBMIT_REQUEST}
        cancelLabel={TEXT.CANCEL}
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
      />

      <AppToast
        message={toastMessage}
        type={toastType === "error" ? "error" : "success"}
      />
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
    gap: 20,
    padding: 16,
    paddingBottom: 32,
  },
  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 14,
  },
  policyCard: {
    marginBottom: 0,
  },
  field: {
    paddingHorizontal: 0,
    paddingVertical: 12,
    gap: 10,
  },
  fieldLabel: {
    fontSize: 15,
    lineHeight: 20,
    color: c.text,
    fontFamily: AppFonts.psuBold,
  },
  requiredMark: {
    color: c.danger,
    fontFamily: AppFonts.psuBold,
  },
  optionalMark: {
    color: c.textMuted,
    fontSize: 13,
    fontFamily: AppFonts.psuRegular,
  },
  input: {
    minHeight: 40,
    color: c.text,
    fontFamily: AppFonts.psuRegular,
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: 0,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: "top",
  },
  inputError: {
    borderBottomWidth: 1.5,
    borderBottomColor: c.danger,
  },
  fieldError: {
    fontSize: 12,
    lineHeight: 17,
    color: c.danger,
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
});

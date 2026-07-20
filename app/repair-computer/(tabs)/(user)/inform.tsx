import { TEXT } from "@/constants/text";
import { router, useFocusEffect } from "expo-router";
import { navReplace } from "@/utils/navigation";
import { useCallback, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { type AppColors, useThemedStyles } from '@/constants/theme';

import { AppToast } from "@/components/app-toast";
import { FloatingActionBar } from "@/components/floating-action-bar";
import { LoadingAnimate } from "@/components/loading-animate";
import { NavTopBar } from "@/components/nav-top-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button, ConfirmDialog, TextField } from "@/components/ui";
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

          <View style={styles.formFields}>
            <TextField
              label={TEXT.REPAIR_COMPUTER_DETAIL}
              required
              multiline
              numberOfLines={4}
              value={detail}
              onChangeText={(value) => {
                setDetail(value);
                clearValidationError("detail");
              }}
              placeholder="Describe the problem in detail..."
              error={validationErrors.detail}
            />

            <TextField
              label={TEXT.REPAIR_COMPUTER_SUPPLY_CODE}
              optional
              value={supplyCode}
              onChangeText={setSupplyCode}
              placeholder="e.g. PC-12345"
            />

            <TextField
              label={TEXT.REPAIR_COMPUTER_PHONE}
              required
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(value) => {
                setPhone(value);
                clearValidationError("phone");
              }}
              placeholder="+66 (0)00 000-0000"
              error={validationErrors.phone}
            />
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
        title={TEXT.REPAIR_COMPUTER_INFORM}
        message="Are you sure you want to submit this repair computer request?"
        confirmLabel="Confirm"
        cancelLabel={TEXT.CANCEL}
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
      />

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
  formFields: {
    gap: 16,
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

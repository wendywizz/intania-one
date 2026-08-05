import { Check } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NavTopBar } from '@/components/nav-top-bar';
import { SectionCard } from '@/components/section-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useToast } from '@/components/toast-provider';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { updateMyProfileInfo } from '@/services/myProfileService';

// The focused underline is our focus affordance, so suppress the browser's own
// outline on web (same helper the absence forms use).
const webNoOutline: any = Platform.OS === 'web' ? { outlineStyle: 'none' } : null;

type Field = 'phone' | 'email';

const FIELD_CONFIG: Record<Field, {
  title: string;
  description: string;
  label: string;
  placeholder: string;
  keyboardType: React.ComponentProps<typeof TextInput>['keyboardType'];
}> = {
  phone: {
    title: TEXT.EDIT_PROFILE_PHONE_TITLE,
    description: TEXT.EDIT_PROFILE_PHONE_DESCRIPTION,
    label: TEXT.EDIT_PROFILE_PHONE_LABEL,
    placeholder: TEXT.EDIT_PROFILE_PHONE_PLACEHOLDER,
    keyboardType: 'phone-pad',
  },
  email: {
    title: TEXT.EDIT_PROFILE_EMAIL_TITLE,
    description: TEXT.EDIT_PROFILE_EMAIL_DESCRIPTION,
    label: TEXT.EDIT_PROFILE_EMAIL_LABEL,
    placeholder: TEXT.EDIT_PROFILE_EMAIL_PLACEHOLDER,
    keyboardType: 'email-address',
  },
};

export default function EditMyProfileFieldScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ field?: string; value?: string; staffId?: string }>();
  const field = (params.field === 'email' ? 'email' : 'phone') as Field;
  const staffId = params.staffId ?? '';
  const config = FIELD_CONFIG[field];

  const original = (params.value ?? '').trim();
  const [value, setValue] = useState(params.value ?? '');
  const [isFocused, setIsFocused] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const trimmed = value.trim();
  // Nothing to send when the value is unchanged, and pressing save on it should
  // not report a success the server was never asked for.
  const canSave = trimmed.length > 0 && trimmed !== original && Boolean(staffId) && !isSaving;

  const handleSubmit = () => {
    if (canSave) setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!canSave) return;
    setIsSaving(true);
    try {
      await updateMyProfileInfo(staffId, field, trimmed);
      setConfirmOpen(false);
      // The toast is mounted at the root, so it survives this screen closing —
      // and the profile behind it reloads on focus and shows the stored value.
      showToast(TEXT.EDIT_PROFILE_UPDATE_SUCCESS, 'success');
      router.back();
    } catch (error) {
      setConfirmOpen(false);
      showToast(
        error instanceof Error ? error.message : TEXT.EDIT_PROFILE_UPDATE_FAILED,
        'error',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ThemedView style={styles.container} lightColor={c.background} darkColor={c.background}>
      <StatusBar style="light" />
      <NavTopBar title={config.title} tone="primary" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Scrollable body */}
        <View style={styles.body}>
          {/* The same card the absence forms wrap their inputs in, so the field
              sits on a surface instead of floating on the canvas. */}
          <SectionCard title={config.label}>
            <TextInput
              ref={inputRef}
              style={[styles.input, isFocused && styles.inputFocused, webNoOutline]}
              value={value}
              onChangeText={setValue}
              keyboardType={config.keyboardType}
              autoCapitalize={field === 'email' ? 'none' : 'words'}
              autoCorrect={false}
              placeholder={config.placeholder}
              placeholderTextColor={c.textFaint}
              underlineColorAndroid="transparent"
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              editable={!isSaving}
            />
            {/* Helper text below the field it explains, not above it — the user
                reads the label, types, then finds out what the value is for. */}
            <ThemedText style={styles.description}>{config.description}</ThemedText>
          </SectionCard>
        </View>

        {/* Save button pinned to bottom */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              !canSave && styles.saveButtonDisabled,
              pressed && canSave && styles.saveButtonPressed,
            ]}
            onPress={handleSubmit}
            disabled={!canSave}
            accessibilityRole="button"
          >
            {isSaving ? (
              <ThemedText style={styles.saveButtonText}>{TEXT.EDIT_PROFILE_SAVING}</ThemedText>
            ) : (
              <>
                <Check size={18} color={c.textOnPrimary} />
                <ThemedText style={styles.saveButtonText}>{TEXT.EDIT_PROFILE_SAVE}</ThemedText>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Every write in this app asks first. The new value is in the message so
          the decision is made on what will actually be stored, not on what the
          field looked like a moment ago. */}
      <ConfirmDialog
        visible={confirmOpen}
        title={TEXT.EDIT_PROFILE_CONFIRM_TITLE}
        message={`${field === 'email' ? TEXT.EDIT_PROFILE_CONFIRM_EMAIL : TEXT.EDIT_PROFILE_CONFIRM_PHONE}\n\n${trimmed}`}
        confirmLabel={TEXT.SHARED_CONFIRM}
        cancelLabel={TEXT.CANCEL}
        loading={isSaving}
        onConfirm={handleConfirm}
        onCancel={() => { if (!isSaving) setConfirmOpen(false); }}
      />
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1, justifyContent: 'space-between' },

  body: {
    padding: 20,
    gap: 24,
  },

  // Helper text under the input: a step down from the value it describes.
  description: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: AppFonts.psuRegular,
    color: c.textMuted,
  },

  // Underlined field, matching the absence form screens. The label above it is
  // now the card's own header, so neither lives here any more.
  input: {
    minHeight: 40,
    color: c.text,
    fontFamily: AppFonts.psuRegular,
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: 0,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.inputBorder,
  },
  inputFocused: {
    borderBottomWidth: 1.5,
    borderBottomColor: c.primary,
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: c.surfaceAlt,
  },
  saveButton: {
    backgroundColor: c.pomegranate,
    borderRadius: 12,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: c.borderStrong,
  },
  saveButtonPressed: {
    opacity: 0.85,
  },
  saveButtonText: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: AppFonts.psuBold,
    color: c.textOnPrimary,
  },
});

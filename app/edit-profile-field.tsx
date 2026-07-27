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

import { AppToast } from '@/components/app-toast';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { updatePersonInfo } from '@/services/personService';

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

export default function EditProfileFieldScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ field?: string; value?: string; staffId?: string }>();
  const field = (params.field === 'email' ? 'email' : 'phone') as Field;
  const staffId = params.staffId ?? '';
  const config = FIELD_CONFIG[field];

  const [value, setValue] = useState(params.value ?? '');
  const [isFocused, setIsFocused] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleSave = async () => {
    if (!value.trim() || !staffId) return;
    setIsSaving(true);
    try {
      await updatePersonInfo(staffId, field, value.trim());
      setToastType('success');
      setToastMessage(TEXT.EDIT_PROFILE_UPDATE_SUCCESS);
    } catch (error) {
      setToastType('error');
      setToastMessage(error instanceof Error ? error.message : TEXT.EDIT_PROFILE_UPDATE_FAILED);
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = value.trim().length > 0 && Boolean(staffId) && !isSaving;

  return (
    <ThemedView style={styles.container} lightColor="#F5F6FA">
      <StatusBar style="light" />
      <NavTopBar title={config.title} tone="primary" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Scrollable body */}
        <View style={styles.body}>
          <ThemedText style={styles.description}>{config.description}</ThemedText>

          <View style={styles.field}>
            <ThemedText style={styles.fieldLabel}>{config.label}</ThemedText>
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
              onSubmitEditing={canSave ? handleSave : undefined}
            />
          </View>
        </View>

        {/* Save button pinned to bottom */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              !canSave && styles.saveButtonDisabled,
              pressed && canSave && styles.saveButtonPressed,
            ]}
            onPress={handleSave}
            disabled={!canSave}
            accessibilityRole="button"
          >
            {isSaving ? (
              <ThemedText style={styles.saveButtonText}>{TEXT.EDIT_PROFILE_SAVING}</ThemedText>
            ) : (
              <>
                <Check size={18} color="#FFFFFF" />
                <ThemedText style={styles.saveButtonText}>{TEXT.EDIT_PROFILE_SAVE}</ThemedText>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <AppToast message={toastMessage} type={toastType} />
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

  description: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: AppFonts.psuRegular,
    color: c.textMuted,
  },

  // Underlined field, matching the absence form screens.
  field: {
    paddingHorizontal: 0,
    paddingVertical: 12,
    gap: 10,
  },
  fieldLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: AppFonts.psuBold,
    color: c.text,
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

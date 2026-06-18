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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppToast } from '@/components/app-toast';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppFonts } from '@/constants/fonts';

type Field = 'phone' | 'email';

const FIELD_CONFIG: Record<Field, {
  title: string;
  description: string;
  label: string;
  placeholder: string;
  keyboardType: React.ComponentProps<typeof TextInput>['keyboardType'];
}> = {
  phone: {
    title: 'Edit Phone Number',
    description: 'Update your office phone number. This will be visible to other staff members in the directory.',
    label: 'Phone Number',
    placeholder: 'e.g. +1 (555) 000-0000',
    keyboardType: 'phone-pad',
  },
  email: {
    title: 'Edit Email Address',
    description: 'Update your work email address. Make sure it is valid as it will be used for official communications.',
    label: 'Email Address',
    placeholder: 'e.g. name@email.psu.ac.th',
    keyboardType: 'email-address',
  },
};

export default function EditProfileFieldScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ field?: string; value?: string }>();
  const field = (params.field === 'email' ? 'email' : 'phone') as Field;
  const config = FIELD_CONFIG[field];

  const [value, setValue] = useState(params.value ?? '');
  const [isFocused, setIsFocused] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleSave = async () => {
    if (!value.trim()) return;
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setIsSaving(false);
    setToastMessage(`${config.label} updated successfully`);
    setTimeout(() => router.back(), 1400);
  };

  const canSave = value.trim().length > 0 && !isSaving;

  return (
    <ThemedView style={styles.container} lightColor="#F5F6FA">
      <StatusBar style="light" />
      <NavTopBar title={config.title} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Scrollable body */}
        <View style={styles.body}>
          <ThemedText style={styles.description}>{config.description}</ThemedText>

          <View style={styles.fieldGroup}>
            <ThemedText style={styles.fieldLabel}>{config.label}</ThemedText>
            <Pressable onPress={() => inputRef.current?.focus()} style={[styles.inputBox, isFocused && styles.inputBoxFocused]}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                value={value}
                onChangeText={setValue}
                keyboardType={config.keyboardType}
                autoCapitalize={field === 'email' ? 'none' : 'words'}
                autoCorrect={false}
                placeholder={config.placeholder}
                placeholderTextColor="#9CA3AF"
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                returnKeyType="done"
                onSubmitEditing={canSave ? handleSave : undefined}
              />
            </Pressable>
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
              <ThemedText style={styles.saveButtonText}>Saving…</ThemedText>
            ) : (
              <>
                <Check size={18} color="#FFFFFF" />
                <ThemedText style={styles.saveButtonText}>Save Changes</ThemedText>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <AppToast message={toastMessage} type="success" />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
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
    color: '#6B7280',
  },

  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: AppFonts.psuBold,
    color: '#374151',
  },
  inputBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
  },
  inputBoxFocused: {
    borderColor: '#B33939',
  },
  input: {
    fontFamily: AppFonts.psuRegular,
    fontSize: 15,
    lineHeight: 22,
    color: '#191C1F',
    paddingVertical: 13,
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: '#F5F6FA',
  },
  saveButton: {
    backgroundColor: '#B33939',
    borderRadius: 12,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  saveButtonPressed: {
    opacity: 0.85,
  },
  saveButtonText: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: AppFonts.psuBold,
    color: '#FFFFFF',
  },
});

/**
 * TextField — the single labeled text input for the whole app.
 *
 * Replaces per-screen raw <TextInput> + ad-hoc label/error markup. Themed via
 * useColors(), 46pt min height, supports label, required/optional tags, helper
 * and error text, multiline, and a password show/hide toggle.
 */
import { useState } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  ViewStyle,
} from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppFonts } from '@/constants/fonts';
import { useColors } from '@/constants/theme';

type TextFieldProps = TextInputProps & {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  /** Shows a subtle "optional" tag next to the label. */
  optional?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

export function TextField({
  label,
  error,
  helperText,
  required = false,
  optional = false,
  multiline = false,
  secureTextEntry = false,
  containerStyle,
  style,
  ...rest
}: TextFieldProps) {
  const c = useColors();
  const [hidden, setHidden] = useState(secureTextEntry);
  const isPassword = secureTextEntry;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: c.text }]}>
            {label}
            {required ? <Text style={{ color: c.danger }}> *</Text> : null}
          </Text>
          {optional ? <Text style={[styles.optional, { color: c.textFaint }]}>ไม่บังคับ</Text> : null}
        </View>
      ) : null}

      <View style={styles.inputWrap}>
        <TextInput
          multiline={multiline}
          numberOfLines={multiline ? 2 : 1}
          secureTextEntry={isPassword && hidden}
          placeholderTextColor={c.textFaint}
          style={[
            styles.input,
            {
              color: c.text,
              backgroundColor: c.surfaceMuted,
              borderColor: error ? c.danger : c.border,
            },
            multiline && styles.multiline,
            isPassword && styles.inputWithAdornment,
            style,
          ]}
          textAlignVertical={multiline ? 'top' : 'center'}
          {...rest}
        />
        {isPassword ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            hitSlop={8}
            onPress={() => setHidden((h) => !h)}
            style={styles.adornment}
          >
            <IconSymbol name={hidden ? 'eye' : 'eye.slash'} size={18} color={c.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text style={[styles.helper, { color: c.danger }]}>{error}</Text>
      ) : helperText ? (
        <Text style={[styles.helper, { color: c.textMuted }]}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 14, lineHeight: 20, fontFamily: AppFonts.psuBold },
  optional: { fontSize: 12, lineHeight: 18, fontFamily: AppFonts.psuRegular },
  inputWrap: { position: 'relative', justifyContent: 'center' },
  input: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    fontFamily: AppFonts.psuRegular,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  // Two lines of text plus the vertical padding.
  multiline: { minHeight: 60 },
  inputWithAdornment: { paddingRight: 44 },
  adornment: { position: 'absolute', right: 12, height: 24, width: 24, alignItems: 'center', justifyContent: 'center' },
  helper: { fontSize: 12, lineHeight: 17, fontFamily: AppFonts.psuRegular },
});

import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { SenderAvatar } from '@/components/mail/sender-avatar';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { suggestRecipients, type MailRecipient } from '@/services/mailService';

const SUGGEST_DEBOUNCE_MS = 300;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string) {
  return EMAIL_PATTERN.test(value.trim());
}

/**
 * One To/Cc line in the composer: the people already added as chips, then a
 * text input that suggests directory staff as you type. An address that isn't
 * in the directory is added as typed, on return, comma, space or leaving the
 * field — the directory only knows faculty staff, and mail goes to anyone.
 */
export function RecipientField({
  label,
  recipients,
  onChange,
  onEdited,
}: {
  label: string;
  recipients: MailRecipient[];
  onChange: (next: MailRecipient[]) => void;
  /** Any edit at all — the composer's "is there anything to lose" flag. */
  onEdited?: () => void;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const [text, setText] = useState('');
  const [suggestions, setSuggestions] = useState<MailRecipient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const term = text.trim();
    if (term.length < 2) {
      requestId.current += 1;
      setSuggestions([]);
      setIsLoading(false);
      return undefined;
    }

    const id = ++requestId.current;
    setIsLoading(true);
    const timeoutId = setTimeout(() => {
      suggestRecipients(term)
        .then((result) => {
          if (id !== requestId.current) return;
          const taken = new Set(recipients.map((r) => r.address.toLowerCase()));
          setSuggestions(result.filter((r) => !taken.has(r.address.toLowerCase())));
        })
        // A failed lookup only means no suggestions; typing the address still works.
        .catch(() => {
          if (id === requestId.current) setSuggestions([]);
        })
        .finally(() => {
          if (id === requestId.current) setIsLoading(false);
        });
    }, SUGGEST_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [text, recipients]);

  function add(recipient: MailRecipient) {
    const address = recipient.address.trim();
    if (!recipients.some((r) => r.address.toLowerCase() === address.toLowerCase())) {
      onChange([...recipients, { name: recipient.name, address }]);
    }
    setText('');
    setSuggestions([]);
    setInvalid(false);
    onEdited?.();
  }

  function remove(address: string) {
    onChange(recipients.filter((r) => r.address !== address));
    onEdited?.();
  }

  /**
   * Turns what was typed into a recipient, if it is an address. Only an
   * explicit return complains about one that isn't: leaving the field with a
   * half-typed name is normal — on web it happens on the way to clicking a
   * suggestion, and an error line appearing at that moment would push the
   * suggestions down under the pointer mid-click.
   */
  function commitTyped(explicit: boolean) {
    const value = text.trim().replace(/[,;]+$/, '');
    if (!value) {
      setInvalid(false);
      return;
    }
    if (isValidEmail(value)) {
      add({ name: '', address: value });
    } else if (explicit) {
      setInvalid(true);
    }
  }

  function handleChangeText(value: string) {
    setInvalid(false);
    onEdited?.();
    // A separator right after an address is the same as pressing return.
    if (/[,;\s]$/.test(value) && isValidEmail(value.trim().replace(/[,;]+$/, ''))) {
      add({ name: '', address: value.trim().replace(/[,;]+$/, '') });
      return;
    }
    setText(value);
  }

  return (
    <View>
      <View style={styles.line}>
        <ThemedText style={styles.label}>{label}:</ThemedText>
        <View style={styles.chips}>
          {recipients.map((recipient) => (
            <View key={recipient.address} style={styles.chip}>
              <ThemedText style={styles.chipText} numberOfLines={1}>
                {recipient.name || recipient.address}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${TEXT.MAIL_COMPOSE_REMOVE_RECIPIENT} ${recipient.address}`}
                hitSlop={8}
                onPress={() => remove(recipient.address)}
              >
                <IconSymbol name="xmark" size={12} color={c.primary} />
              </Pressable>
            </View>
          ))}
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            onBlur={() => commitTyped(false)}
            onChangeText={handleChangeText}
            onSubmitEditing={() => commitTyped(true)}
            placeholder={recipients.length ? '' : TEXT.MAIL_COMPOSE_RECIPIENT_PLACEHOLDER}
            placeholderTextColor={c.textFaint}
            returnKeyType="next"
            blurOnSubmit={false}
            value={text}
            style={[styles.input, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
          />
        </View>
        {isLoading ? <ActivityIndicator size="small" color={c.primary} /> : null}
      </View>

      {invalid ? <ThemedText style={styles.error}>{TEXT.MAIL_COMPOSE_INVALID_EMAIL}</ThemedText> : null}

      {suggestions.length > 0 ? (
        <View style={styles.suggestions}>
          {suggestions.map((recipient) => (
            <Pressable
              key={recipient.address}
              accessibilityRole="button"
              onPress={() => add(recipient)}
              style={({ pressed }) => [styles.suggestion, pressed ? styles.pressed : null]}
            >
              <SenderAvatar name={recipient.name} address={recipient.address} size={30} />
              <View style={styles.suggestionText}>
                {recipient.name ? (
                  <ThemedText style={styles.suggestionName} numberOfLines={1}>
                    {recipient.name}
                  </ThemedText>
                ) : null}
                <ThemedText style={styles.suggestionAddress} numberOfLines={1}>
                  {recipient.address}
                </ThemedText>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  line: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 10,
  },
  label: {
    fontFamily: AppFonts.psuRegular,
    fontSize: 15,
    lineHeight: 30,
    color: c.textMuted,
  },
  chips: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 15,
    backgroundColor: c.primarySoft,
  },
  chipText: {
    flexShrink: 1,
    fontFamily: AppFonts.psuBold,
    fontSize: 13.5,
    color: c.primary,
  },
  input: {
    flexGrow: 1,
    minWidth: 120,
    height: 30,
    paddingVertical: 0,
    color: c.text,
    fontFamily: AppFonts.psuRegular,
    fontSize: 15,
  },
  error: {
    fontFamily: AppFonts.psuRegular,
    fontSize: 12.5,
    color: c.danger,
    marginTop: -4,
    marginBottom: 8,
  },
  suggestions: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.surface,
    marginBottom: 10,
    overflow: 'hidden',
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  pressed: { backgroundColor: c.surfaceAlt },
  suggestionText: { flex: 1, gap: 1 },
  suggestionName: { fontFamily: AppFonts.psuBold, fontSize: 14, color: c.text },
  suggestionAddress: { fontFamily: AppFonts.psuRegular, fontSize: 12.5, color: c.textMuted },
});

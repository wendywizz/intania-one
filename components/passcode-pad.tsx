import { Delete } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppFonts } from '@/constants/fonts';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { PASSCODE_LENGTH } from '@/services/appPasswordService';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'] as const;

type PasscodePadProps = {
  value: string;
  onChange: (next: string) => void;
  length?: number;
  /**
   * Styles the pad for a branded fill (the lock overlay) rather than a normal
   * surface. Dots and keys go white instead of taking the text colour.
   */
  onPrimary?: boolean;
};

/**
 * The iOS-Settings-style passcode entry: a row of dots that fill as digits are
 * tapped, over a numeric keypad. Deliberately self-contained rather than a
 * TextInput — no OS keyboard slides over the screen, and the digits can never
 * be pasted, autofilled, or suggested.
 *
 * The caller owns the value and decides what a full passcode means, so the same
 * pad serves "set", "confirm", and "unlock".
 */
export function PasscodePad({
  value,
  onChange,
  length = PASSCODE_LENGTH,
  onPrimary = false,
}: PasscodePadProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const tint = onPrimary ? c.textOnPrimary : c.text;

  function press(key: string) {
    if (key === 'delete') {
      onChange(value.slice(0, -1));
      return;
    }
    if (!key || value.length >= length) return;
    onChange(value + key);
  }

  return (
    <View style={styles.root}>
      <View style={styles.dots}>
        {Array.from({ length }, (_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { borderColor: tint },
              i < value.length ? { backgroundColor: tint } : null,
            ]}
          />
        ))}
      </View>

      <View style={styles.keypad}>
        {KEYS.map((key, index) =>
          key === '' ? (
            // Keeps the grid square so "0" sits under "8", as on iOS.
            <View key={`spacer-${index}`} style={styles.key} />
          ) : (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={key === 'delete' ? 'ลบ' : key}
              onPress={() => press(key)}
              disabled={key === 'delete' && value.length === 0}
              style={({ pressed }) => [
                styles.key,
                key !== 'delete' ? [styles.keyFilled, onPrimary && styles.keyFilledOnPrimary] : null,
                pressed && styles.keyPressed,
              ]}
            >
              {key === 'delete' ? (
                <Delete size={24} color={tint} />
              ) : (
                <ThemedText style={[styles.keyLabel, { color: tint }]}>{key}</ThemedText>
              )}
            </Pressable>
          ),
        )}
      </View>
    </View>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  root: { alignItems: 'center', gap: 32 },
  dots: { flexDirection: 'row', gap: 20 },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  keypad: {
    width: 264,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  key: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyFilled: { backgroundColor: c.surfaceMuted },
  keyFilledOnPrimary: { backgroundColor: 'rgba(255,255,255,0.18)' },
  keyPressed: { opacity: 0.6 },
  keyLabel: {
    fontSize: 30,
    lineHeight: 38,
    fontFamily: AppFonts.psuRegular,
  },
});

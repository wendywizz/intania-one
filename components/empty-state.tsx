import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

/**
 * The kinds of empty a list can be, and how each one looks.
 *
 * There are only a few, and which one applies is a question about the screen,
 * not about its wording: a queue with nothing in it is good news, a log with
 * nothing in it is neutral, a search with no hits is a dead end. Naming them
 * here means a screen picks the *meaning* and inherits the icon and the colour,
 * instead of every screen choosing its own glyph and the app ending up with
 * four different pictures of "nothing".
 *
 * The message always comes from the caller — only the screen knows what list
 * is empty, and "ไม่มีข้อมูล" on its own never says.
 */
export const EMPTY_PRESETS = {
  /** A queue that has been worked through: nothing waiting, and that is fine. */
  cleared: { iconName: 'checkmark.circle.fill', tone: 'success' },
  /** A log with nothing in it yet. Neutral — nothing has happened, that is all. */
  history: { iconName: 'history', tone: 'neutral' },
  /** A plain list with no rows. The fallback when none of the others fits. */
  list: { iconName: 'list.bullet', tone: 'neutral' },
  /** A search or filter that matched nothing. */
  search: { iconName: 'magnifyingglass', tone: 'neutral' },
  /** A day, week or month with nothing scheduled in it. */
  schedule: { iconName: 'calendar', tone: 'neutral' },
  /** No people found — an approver list, a directory. */
  people: { iconName: 'person.2.fill', tone: 'neutral' },
} as const satisfies Record<string, { iconName: IconSymbolName; tone: 'neutral' | 'success' }>;

export type EmptyPreset = keyof typeof EMPTY_PRESETS;

type EmptyStateProps = {
  /**
   * Which kind of empty this is. Sets the icon and the tone; either can still
   * be overridden by passing `iconName` or `tone` alongside it.
   */
  preset?: EmptyPreset;
  /**
   * Preferred: an icon from the shared IconSymbol set (avoids the lucide barrel
   * import). Falls back to `icon` when not provided.
   */
  iconName?: IconSymbolName;
  /** @deprecated Pass `iconName` instead — a direct LucideIcon pulls in the barrel. */
  icon?: LucideIcon;
  /** "No data" message under the icon. */
  message: string;
  /**
   * A line under the message saying what would appear here and why it does
   * not. "ไม่มีข้อมูล" states the obvious — the screen is visibly empty — and
   * leaves the reader wondering whether the list is broken, filtered, or simply
   * has nothing to show. This is the sentence that answers that.
   */
  description?: string;
  /**
   * `success` when an empty list is the good outcome — no missed timestamps, no
   * outstanding requests. A grey inbox reads as "nothing found"; a green tick
   * reads as "nothing wrong", and on those screens the second is the truth.
   */
  tone?: 'neutral' | 'success';
  style?: StyleProp<ViewStyle>;
};

/**
 * Shared "no data" state for empty lists. The icon sits in a soft circle tinted
 * from the surface, and both the circle and icon use a *darker shade of the
 * background tone* so the state reads as a deliberate, calm placeholder in both
 * light and dark themes (rather than a barely-visible pale glyph).
 */
export function EmptyState({
  preset,
  iconName,
  icon: Icon,
  message,
  description,
  tone,
  style,
}: EmptyStateProps) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);

  // The explicit props win, so a screen can take a preset and still change one
  // half of it without falling back to spelling out both.
  const resolved = preset ? EMPTY_PRESETS[preset] : undefined;
  const glyphName = iconName ?? resolved?.iconName;
  const success = (tone ?? resolved?.tone ?? 'neutral') === 'success';
  const glyphColor = success ? c.success : c.textFaint;

  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.circle, success && styles.circleSuccess]}>
        {glyphName ? (
          <IconSymbol name={glyphName} size={52} color={glyphColor} />
        ) : Icon ? (
          <Icon size={52} color={glyphColor} strokeWidth={1.75} />
        ) : null}
      </View>
      <ThemedText style={[styles.message, success && styles.messageSuccess]} type="defaultSemiBold">
        {message}
      </ThemedText>
      {description ? (
        <ThemedText style={styles.description}>{description}</ThemedText>
      ) : null}
    </View>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  wrap: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
    // Tight: the icon and the line under it are one statement, and the wide gap
    // read as two separate things stacked.
    gap: 6,
  },
  circle: {
    // Sized around the 52pt glyph — the circle is the frame, so it grows with
    // what it frames rather than crowding it.
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: c.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleSuccess: {
    backgroundColor: c.successSoft,
    borderColor: 'transparent',
  },
  message: {
    color: c.text,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
  messageSuccess: {
    color: c.success,
  },
  description: {
    color: c.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    // Held short of the full width: a centred line that runs edge to edge reads
    // as a paragraph, and this is a caption.
    maxWidth: 320,
  },
});

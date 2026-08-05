import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import {
  EmptyIllustration,
  type EmptyIllustrationName,
} from '@/components/empty-illustration';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

/**
 * The kinds of empty a list can be, and how each one looks.
 *
 * There are only a few, and which one applies is a question about the screen,
 * not about its wording: a queue with nothing in it is good news, a log with
 * nothing in it is neutral, a search with no hits is a dead end. Naming them
 * here means a screen picks the *meaning* and inherits the picture and the
 * colour, instead of every screen choosing its own glyph and the app ending up
 * with four different pictures of "nothing".
 *
 * Each preset also names an illustration (see `empty-illustration.tsx`), which
 * is what actually gets drawn; `iconName` stays as the fallback for callers
 * that pass a glyph of their own.
 *
 * The message always comes from the caller — only the screen knows what list
 * is empty, and "ไม่มีข้อมูล" on its own never says.
 */
export const EMPTY_PRESETS = {
  /** A queue that has been worked through: nothing waiting, and that is fine. */
  cleared: { iconName: 'checkmark.circle.fill', tone: 'success', art: 'positive' },
  /** Nothing of the reader's own is waiting on someone else's decision. */
  pending: { iconName: 'calendar', tone: 'neutral', art: 'calendar' },
  /** A log with nothing in it yet. Nothing has happened, and that is not a fault. */
  history: { iconName: 'history', tone: 'neutral', art: 'history' },
  /** A plain list with no rows. The fallback when none of the others fits. */
  list: { iconName: 'list.bullet', tone: 'neutral', art: 'positive' },
  /** A search or filter that matched nothing — the one genuinely negative case. */
  search: { iconName: 'magnifyingglass', tone: 'neutral', art: 'search' },
  /** A day, week or month with nothing scheduled in it. */
  schedule: { iconName: 'calendar', tone: 'neutral', art: 'calendar' },
  /** No people found — an approver list, a directory. A search by another name. */
  people: { iconName: 'person.2.fill', tone: 'neutral', art: 'search' },
  /** Nobody is meeting: a day with no meetings, a room with nothing booked. */
  meeting: { iconName: 'person.2.fill', tone: 'neutral', art: 'meeting' },
  /** Nothing to fix: a repair queue, a job list, a technician's day. */
  repair: { iconName: 'wrench.fill', tone: 'neutral', art: 'repair' },
  /** Nothing reported against a place: the notice-repair queues. */
  notice: { iconName: 'wrench.fill', tone: 'neutral', art: 'notice' },
  /** Nothing booked: a room with no reservations against it. */
  room: { iconName: 'door.open', tone: 'neutral', art: 'room' },
  /** No invigilation duty in the selected exam period. */
  exam: { iconName: 'list.bullet', tone: 'neutral', art: 'exam' },
  /** Nothing was missed: no forgotten stamp to file. */
  timestamp: { iconName: 'clock.fill', tone: 'neutral', art: 'timestamp' },
  /** The list could not be reached at all. Not empty — unreachable. */
  offline: { iconName: 'wifi', tone: 'neutral', art: 'offline' },
} as const satisfies Record<
  string,
  { iconName: IconSymbolName; tone: 'neutral' | 'success'; art: EmptyIllustrationName }
>;

export type EmptyPreset = keyof typeof EMPTY_PRESETS;

type EmptyStateProps = {
  /**
   * Which kind of empty this is. Sets the illustration, the icon and the tone;
   * any of them can still be overridden by passing `art`, `iconName` or `tone`
   * alongside it.
   */
  preset?: EmptyPreset;
  /**
   * The picture to draw. Comes from the preset; pass it directly to put a
   * picture on a state that has no preset, or `null` to fall back to the glyph
   * (for tight spaces — an inline section, a half-height card).
   */
  art?: EmptyIllustrationName | null;
  /**
   * What the state is drawn on, so the illustration's knocked-out shapes match.
   * Pass the surface colour when the state sits inside a card.
   */
  backgroundColor?: string;
  /**
   * Drawn width of the illustration. The default suits a state that owns the
   * whole screen; pass something smaller when it sits inside a card that has
   * other content in it.
   */
  artWidth?: number;
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
   * How loudly the state is drawn.
   *
   * - `neutral` — the framed look: glyph in a tinted circle, dark message.
   * - `success` — the same frame in green, for when empty is the good outcome.
   * - `quiet` — no frame at all. A large glyph one step darker than the page
   *   and a muted line under it: present, legible, and not competing with the
   *   screen's own controls. An empty list is the absence of content, and
   *   drawing a bordered medallion in the middle of the screen to announce it
   *   gives nothing more weight than everything.
   */
  tone?: 'neutral' | 'success' | 'quiet';
  /**
   * The one thing to do about the emptiness — usually a `Button` that starts
   * whatever would fill the list. When a screen's only action is "add the first
   * one", it belongs here rather than pinned above an empty page: the reader is
   * already looking at the middle of the screen to find out why it is blank.
   */
  action?: ReactNode;
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
  art,
  backgroundColor,
  artWidth,
  iconName,
  icon: Icon,
  message,
  description,
  tone,
  action,
  style,
}: EmptyStateProps) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);

  // The explicit props win, so a screen can take a preset and still change one
  // half of it without falling back to spelling out both.
  const resolved = preset ? EMPTY_PRESETS[preset] : undefined;
  const glyphName = iconName ?? resolved?.iconName;
  const actualTone = tone ?? resolved?.tone ?? 'neutral';
  const success = actualTone === 'success';
  const quiet = actualTone === 'quiet';
  // `null` is a deliberate "no picture here"; `undefined` just means the caller
  // never said, so the preset decides.
  const illustration = art === null ? undefined : (art ?? resolved?.art);

  // `borderStrong` is the one step above the page colour in both themes — dark
  // enough to read against the background, light enough to stay a background
  // element itself.
  const glyphColor = quiet ? c.borderStrong : success ? c.success : c.textFaint;
  const glyphSize = quiet ? 76 : 52;

  const glyph = glyphName ? (
    <IconSymbol name={glyphName} size={glyphSize} color={glyphColor} />
  ) : Icon ? (
    <Icon size={glyphSize} color={glyphColor} strokeWidth={1.5} />
  ) : null;

  // The drawing already carries the tone and the frame, so it replaces both the
  // medallion and the glyph rather than stacking on top of them.
  return (
    <View style={[styles.wrap, (quiet || illustration) && styles.wrapQuiet, style]}>
      {illustration ? (
        <EmptyIllustration
          name={illustration}
          width={artWidth}
          backgroundColor={backgroundColor}
          style={styles.art}
        />
      ) : quiet ? (
        glyph
      ) : (
        <View style={[styles.circle, success && styles.circleSuccess]}>{glyph}</View>
      )}
      <ThemedText
        style={[
          styles.message,
          // The green belongs to the medallion look. With a drawing above it the
          // message is set in the drawing's own grey instead — one tone, not a
          // grey picture with a coloured caption under it.
          success && !illustration && styles.messageSuccess,
          (quiet || illustration) && styles.messageQuiet,
        ]}
        type="defaultSemiBold">
        {message}
      </ThemedText>
      {description ? (
        <ThemedText style={styles.description}>{description}</ThemedText>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
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
  // No frame, and a little more air between the glyph and the line: with
  // nothing enclosing them, the gap is what holds them together as one mark.
  wrapQuiet: { gap: 12 },
  // The drawing's own ground shadow is already a few points of empty space, so
  // it needs less air under it than a glyph does.
  art: { marginBottom: -4 },
  circleSuccess: {
    backgroundColor: c.successSoft,
    borderColor: 'transparent',
  },
  message: {
    color: c.text,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  messageSuccess: {
    color: c.success,
  },
  // Muted, not full-strength text: the sentence belongs to the same quiet layer
  // as the picture above it, and is set in the same grey the picture is drawn
  // in.
  messageQuiet: {
    color: c.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  // Held off the text by more than the wrap's own gap: the picture and its
  // caption are one statement, and the action is the answer to it.
  action: {
    marginTop: 12,
    alignItems: 'center',
  },
  description: {
    // A step lighter than the message, so the two lines stay a hierarchy while
    // remaining the same grey family as the drawing.
    color: c.textFaint,
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
    // Held short of the full width: a centred line that runs edge to edge reads
    // as a paragraph, and this is a caption.
    maxWidth: 320,
  },
});

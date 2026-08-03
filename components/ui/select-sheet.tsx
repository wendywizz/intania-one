/**
 * The app's one way to choose from a list.
 *
 * Every dropdown used to bring its own menu — notice-repair had a centred fade
 * modal, booking-room had a sheet — which meant picking a work category and
 * picking a room felt like two different apps. This is the sheet version, kept
 * in one place so a change to how choosing works lands everywhere at once.
 *
 * Search appears on its own once the list is long enough to need it, so a
 * five-item list stays a five-item list and a four-hundred-room list is usable.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { Sheet } from '@/components/ui/sheet';
import { TextField } from '@/components/ui/text-field';
import { TEXT } from '@/constants/text';
import { useColors, useThemedStyles } from '@/constants/theme';

/** Below this many options, a search box costs more than it saves. */
const SEARCH_THRESHOLD = 8;

export type SelectSheetOption = {
  /** Stable identity — also what `selectedId` is matched against. */
  id: string;
  label: string;
  /** Second line under the label: a person's name, a building, a code. */
  description?: string;
  /** Optional right-aligned detail: a capacity, a count, a code. */
  meta?: string;
  icon?: IconSymbolName;
  /**
   * Anything richer than an icon on the leading edge — an avatar, a colour
   * swatch. Wins over `icon` when both are given. Kept as a node rather than a
   * union of known cases so a caller can bring its own without this component
   * needing to learn about it.
   */
  leading?: ReactNode;
  /**
   * Anything on the trailing edge — equipment icons, a badge. Sits before the
   * selected tick so the tick stays in the same place down the list.
   */
  trailing?: ReactNode;
  /**
   * Listed but not choosable — a room already booked, a slot already taken.
   *
   * Shown greyed rather than hidden, so the list matches whatever else the
   * person has seen of it, and the absence of an option is never mistaken for
   * the option not existing.
   */
  disabled?: boolean;
  /** Free-text the search should also match, e.g. the underlying id. */
  searchText?: string;
};

export type SelectSheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: SelectSheetOption[];
  selectedId?: string | null;
  onSelect: (option: SelectSheetOption) => void;
  /** Force search on or off; by default it appears for long lists only. */
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  /**
   * Show this many options at first and add another page as the list is
   * scrolled to its end.
   *
   * The options are all in memory either way — this is not fetching, it is
   * refusing to build four hundred rows to show ten. A sheet that opens with a
   * scrollbar the width of a hair tells someone the list is endless before they
   * have read the first name; one that grows as they scroll does not.
   *
   * Omitted, the whole list renders at once, which is right for the short ones.
   */
  pageSize?: number;
};

/** How close to the bottom counts as "at the end", in points. */
const END_THRESHOLD = 120;

export function SelectSheet({
  visible,
  onClose,
  title,
  options,
  selectedId,
  onSelect,
  searchable,
  searchPlaceholder,
  emptyMessage,
  pageSize,
}: SelectSheetProps) {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(pageSize ?? Infinity);

  // A query left over from last time would silently hide options on reopen.
  useEffect(() => {
    if (!visible) setQuery('');
  }, [visible]);

  // Back to the first page whenever the list being shown changes underneath —
  // reopening the sheet, or typing a search that yields its own short list.
  useEffect(() => {
    setShown(pageSize ?? Infinity);
  }, [pageSize, visible, query]);

  const showSearch = searchable ?? options.length > SEARCH_THRESHOLD;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        [o.label, o.description, o.searchText, o.id]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [options, query]);

  const visibleOptions = useMemo(
    () => (shown === Infinity ? filtered : filtered.slice(0, shown)),
    [filtered, shown],
  );
  const hasMore = visibleOptions.length < filtered.length;

  /** Add a page once the scroll is within a screenful of the end. */
  const onScroll = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!hasMore || !pageSize) return;
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const distanceToEnd = contentSize.height - layoutMeasurement.height - contentOffset.y;
    if (distanceToEnd <= END_THRESHOLD) {
      setShown((current) => current + pageSize);
    }
  };

  return (
    // "pop" rather than the default slide-up: this is a menu answering a tap on
    // a field, not a panel arriving from the bottom of the screen. It scales up
    // in place, which reads as belonging to the control that opened it — the
    // same treatment the sick-leave and profile menus use.
    <Sheet visible={visible} onClose={onClose} title={title} animation="pop">
      {showSearch ? (
        <TextField
          value={query}
          onChangeText={setQuery}
          placeholder={searchPlaceholder ?? TEXT.SHARED_SEARCH_PLACEHOLDER}
          autoCorrect={false}
          autoCapitalize="none"
          containerStyle={styles.search}
        />
      ) : null}

      <ScrollView
        style={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={64}>
        {filtered.length === 0 ? (
          <ThemedText style={styles.empty}>
            {query ? TEXT.SHARED_NO_SEARCH_RESULT : emptyMessage ?? TEXT.SHARED_EMPTY_DATA}
          </ThemedText>
        ) : (
          visibleOptions.map((option) => {
            const disabled = Boolean(option.disabled);
            const active = !disabled && selectedId != null && option.id === selectedId;

            return (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active, disabled }}
                disabled={disabled}
                onPress={() => {
                  onSelect(option);
                  onClose();
                }}
                style={[styles.option, disabled && styles.optionDisabled]}>
                {option.leading ??
                  (option.icon ? (
                    <IconSymbol
                      name={option.icon}
                      size={18}
                      color={disabled ? c.textFaint : active ? c.primary : c.textMuted}
                    />
                  ) : null)}

                <View style={styles.labelCol}>
                  <ThemedText
                    style={[
                      styles.label,
                      active && styles.labelActive,
                      disabled && styles.labelDisabled,
                    ]}
                    numberOfLines={2}>
                    {option.label}
                  </ThemedText>
                  {option.description ? (
                    <ThemedText
                      style={[
                        styles.description,
                        active && styles.labelActive,
                        disabled && styles.labelDisabled,
                      ]}
                      numberOfLines={2}>
                      {option.description}
                    </ThemedText>
                  ) : null}
                </View>

                {option.meta ? (
                  <ThemedText style={[styles.meta, disabled && styles.labelDisabled]}>
                    {option.meta}
                  </ThemedText>
                ) : null}

                {option.trailing}

                {/* The tick, not just colour, so the choice is legible to
                    anyone who cannot separate the two shades. */}
                {active ? <IconSymbol name="checkmark" size={16} color={c.primary} /> : null}
              </Pressable>
            );
          })
        )}

        {/* A row's worth of space at the foot while more is coming, so the list
            never ends flush against the last option and look finished. */}
        {hasMore ? <View style={styles.more} /> : null}
      </ScrollView>
    </Sheet>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    search: { marginBottom: 8 },
    // Capped so a long list scrolls inside the sheet instead of pushing it off
    // the screen; short lists still size to their content.
    list: { maxHeight: 360 },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      // Roomy rows: these are tap targets in a menu, and 12 left the text
      // crowded against the hairline above and below it. 16 keeps every option
      // comfortably past the 44pt minimum touch height even on a single line.
      paddingVertical: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    // Greyed the whole row rather than only the label, so a taken option reads
    // as out of play before any single word of it is read.
    optionDisabled: { opacity: 0.55 },
    labelCol: { flex: 1, gap: 2 },
    label: { fontSize: 15, color: c.text },
    description: { fontSize: 12, color: c.textMuted },
    labelActive: { color: c.primary },
    labelDisabled: { color: c.textFaint },
    meta: { fontSize: 12, color: c.textMuted },
    empty: { color: c.textMuted, textAlign: 'center', paddingVertical: 24 },
    more: { height: 24 },
  });

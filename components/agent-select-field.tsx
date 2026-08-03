import { Minus } from "lucide-react-native";
import { useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

import { AppFonts } from "@/constants/fonts";
import { TEXT } from "@/constants/text";
import { SelectSheet, type SelectSheetOption } from "@/components/ui/select-sheet";
import { ThemedText } from "./themed-text";
import { UserAvatar } from "./user-avatar";

type AgentSelectFieldProps = {
  options: string[];
  selectedAgents: string[];
  /** Resolve an option/agent label to its staff photo id (uni_staff_id). */
  photoIdForOption?: (option: string) => string | undefined;
  /** Resolve an option/agent label to a secondary line (e.g. department). */
  subtitleForOption?: (option: string) => string | undefined;
  isOpen: boolean;
  hasError?: boolean;
  errorMessage?: string;
  onToggle: () => void;
  onSelect: (agent: string) => void;
  onRemove: (agent: string) => void;
};

export function AgentSelectField({
  options,
  selectedAgents,
  photoIdForOption,
  subtitleForOption,
  isOpen,
  hasError,
  errorMessage,
  onToggle,
  onSelect,
  onRemove,
}: AgentSelectFieldProps) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);

  // The sheet owns the searching; this only maps people onto its option shape.
  const sheetOptions = useMemo<SelectSheetOption[]>(
    () =>
      options.map((option) => ({
        id: option,
        label: option,
        description: subtitleForOption?.(option),
        leading: photoIdForOption?.(option) ? (
          <UserAvatar staffId={photoIdForOption(option)} size={40} />
        ) : undefined,
        disabled: selectedAgents.includes(option),
      })),
    [options, photoIdForOption, subtitleForOption, selectedAgents],
  );

  const handleToggle = () => onToggle();

  const handleSelect = (agent: string) => onSelect(agent);

  return (
    <View style={styles.field}>
      <ThemedText style={styles.fieldLabel}>{TEXT.ABSENCE_DELEGATE_LABEL}</ThemedText>
      <Pressable
        accessibilityRole="button"
        onPress={handleToggle}
        style={[styles.selectButton, hasError ? styles.inputError : undefined]}
      >
        <ThemedText style={[styles.selectText, styles.placeholder]}>
          {TEXT.ABSENCE_DELEGATE_PLACEHOLDER}
        </ThemedText>
        <ThemedText style={styles.chevron}>⌄</ThemedText>
      </Pressable>
      {errorMessage ? (
        <ThemedText style={styles.fieldError}>{errorMessage}</ThemedText>
      ) : null}

      {selectedAgents.length ? (
        <View style={styles.agentList}>
          {selectedAgents.map((selectedAgent, index) => (
            <AgentRow
              key={`${String(selectedAgent)}-${index}`}
              agent={selectedAgent}
              photoId={photoIdForOption?.(selectedAgent)}
              subtitle={subtitleForOption?.(selectedAgent)}
              styles={styles}
              color={c}
              onRemove={onRemove}
            />
          ))}
        </View>
      ) : null}

      {/* The app's one way to choose from a list — the same sheet the room and
          category pickers use. This used to be a centred fade modal with its
          own search box and its own row layout, which made picking a stand-in
          feel like a different app from picking anything else.

          Already-chosen people stay in the list, greyed: the sheet closes on
          each pick and is reopened to add the next, and a name vanishing
          between openings reads as the person having gone, not as them having
          been added. */}
      <SelectSheet
        visible={isOpen}
        onClose={handleToggle}
        title={TEXT.ABSENCE_DELEGATE_LABEL}
        searchPlaceholder={TEXT.SHARED_SEARCH_NAME_PLACEHOLDER}
        emptyMessage={TEXT.SHARED_EMPTY_DATA}
        options={sheetOptions}
        // Ten names, then another ten each time the list is scrolled to its
        // end. The whole staff list arrives in one response, so this is about
        // how much of it is drawn at once — a sheet that renders four hundred
        // rows with avatars to show ten stutters on the way open.
        pageSize={10}
        onSelect={(option) => handleSelect(option.id)}
      />
    </View>
  );
}

/**
 * One chosen stand-in, which leaves by collapsing rather than disappearing.
 *
 * Removing someone from a list of three is easy to do to the wrong row, and a
 * row that vanishes on the same frame as the tap gives nothing to check against
 * — the list simply looks different afterwards. Sliding it out to the right and
 * closing the gap it leaves shows which row went, and shows the ones below
 * moving up into its place rather than appearing to have been the one removed.
 *
 * The parent is told only when the animation finishes, so the row being
 * animated is still in `selectedAgents` while it plays; there is nothing to
 * keep a copy of and nothing to fall out of sync.
 */
function AgentRow({
  agent,
  photoId,
  subtitle,
  styles,
  color,
  onRemove,
}: {
  agent: string;
  photoId?: string;
  subtitle?: string;
  styles: ReturnType<typeof makeStyles>;
  color: AppColors;
  onRemove: (agent: string) => void;
}) {
  const progress = useRef(new Animated.Value(1)).current;
  const [removing, setRemoving] = useState(false);

  const remove = () => {
    // Guard the double tap: the row is still mounted while it plays, and a
    // second press would fire onRemove twice for the same person.
    if (removing) return;
    setRemoving(true);

    Animated.timing(progress, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.quad),
      // Height cannot be driven natively, and the row has to collapse or the
      // gap it leaves would close in one jump at the end.
      useNativeDriver: false,
    }).start(() => onRemove(agent));
  };

  return (
    <Animated.View
      style={[
        styles.agentListItem,
        {
          opacity: progress,
          maxHeight: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 96] }),
          transform: [
            { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
          ],
        },
        removing && styles.agentListItemRemoving,
      ]}>
      <View style={styles.agentRow}>
        {photoId ? <UserAvatar staffId={photoId} size={34} /> : null}
        <View style={styles.agentTextCol}>
          <ThemedText style={styles.agentListText} numberOfLines={1}>
            {agent}
          </ThemedText>
          {subtitle ? (
            <ThemedText style={styles.agentSubtitle} numberOfLines={1}>
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={TEXT.SHARED_DELETE_THAI}
        onPress={remove}
        disabled={removing}
        style={({ pressed }) => [styles.deleteAgentButton, pressed && styles.deleteAgentPressed]}>
        <Minus size={18} color={color.danger} />
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  field: {
    paddingHorizontal: 0,
    paddingVertical: 20,
    gap: 10,
  },
  fieldLabel: {
    fontSize: 15,
    lineHeight: 20,
    color: c.text,
    fontFamily: AppFonts.psuBold,
  },
  selectButton: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 0,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.inputBorder,
  },
  inputError: {
    borderBottomWidth: 1.5,
    borderBottomColor: c.danger,
  },
  selectText: {
    flex: 1,
    color: c.text,
    fontSize: 16,
    fontFamily: AppFonts.psuRegular,
  },
  placeholder: {
    color: c.textFaint,
  },
  chevron: {
    color: c.textMuted,
    fontSize: 18,
    lineHeight: 22,
  },
  fieldError: {
    color: c.danger,
    fontSize: 12,
    lineHeight: 18,
  },
  agentList: {
    marginTop: 12,
    gap: 10,
  },
  agentRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  agentTextCol: {
    flex: 1,
    gap: 2,
  },
  agentSubtitle: {
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
    fontSize: 12,
    lineHeight: 16,
  },
  agentListItem: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 0,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  agentListText: {
    flex: 1,
    color: c.text,
    fontFamily: AppFonts.psuRegular,
    fontSize: 14,
    lineHeight: 20,
  },
  // The row is clipped while it collapses, so its content cannot spill past
  // the shrinking height.
  agentListItemRemoving: { overflow: "hidden" },
  deleteAgentButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: c.danger,
  },
  deleteAgentPressed: { opacity: 0.6, backgroundColor: c.dangerSoft },
});

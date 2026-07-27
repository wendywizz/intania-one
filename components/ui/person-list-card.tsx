import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppFonts } from '@/constants/fonts';
import { USER_PLACEHOLDER } from '@/constants/images';
import { type AppColors, useThemedStyles } from '@/constants/theme';
import { getPersonPhoto } from '@/services/personService';

export type PersonListEntry = {
  /** Stable list key (falls back to index). */
  key?: string;
  name: string;
  /** Secondary line — role, department, etc. */
  subtitle?: string;
  /** Staff id used to resolve the avatar photo; falls back to the placeholder. */
  photoStaffId?: string;
};

type PersonListCardProps = {
  /** Card header title. */
  title: string;
  people: PersonListEntry[];
  /** Show the count badge in the header (default true). */
  showCount?: boolean;
  /** Text appended after the count in the badge (e.g. " คน"). */
  countSuffix?: string;
  /** Shown when `people` is empty. Omit to render nothing. */
  emptyText?: string;
};

function PersonRow({ entry, isFirst }: { entry: PersonListEntry; isFirst: boolean }) {
  const styles = useThemedStyles(makeStyles);
  const [imgError, setImgError] = useState(false);
  const photoUri =
    entry.photoStaffId && !imgError ? getPersonPhoto({ staffId: entry.photoStaffId }) : null;

  return (
    <View style={[styles.row, !isFirst && styles.rowBordered]}>
      <View style={styles.avatar}>
        <Image
          source={photoUri ? { uri: photoUri } : USER_PLACEHOLDER}
          style={styles.avatarImage}
          onError={() => setImgError(true)}
        />
      </View>
      <View style={styles.info}>
        <ThemedText style={styles.name} numberOfLines={2}>
          {entry.name}
        </ThemedText>
        {entry.subtitle ? (
          <ThemedText style={styles.subtitle} numberOfLines={2}>
            {entry.subtitle}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

// Shared "people list" card, matching the examinar detail staff-list section: a
// bordered surface with a header (title + optional count badge) over avatar rows
// separated by hairline dividers. Colors/fonts come from constants/theme.ts.
export function PersonListCard({
  title,
  people,
  showCount = true,
  countSuffix = '',
  emptyText,
}: PersonListCardProps) {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <ThemedText style={styles.heading}>{title}</ThemedText>
        {showCount && people.length > 0 ? (
          <View style={styles.countBadge}>
            <ThemedText style={styles.countText}>
              {people.length}
              {countSuffix}
            </ThemedText>
          </View>
        ) : null}
      </View>
      {people.length > 0 ? (
        people.map((person, index) => (
          <PersonRow key={person.key ?? index} entry={person} isFirst={index === 0} />
        ))
      ) : emptyText ? (
        <ThemedText style={styles.empty}>{emptyText}</ThemedText>
      ) : null}
    </View>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  card: {
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  heading: {
    fontFamily: AppFonts.psuBold,
    fontSize: 15,
    lineHeight: 21,
    color: c.text,
  },
  countBadge: {
    backgroundColor: c.surfaceMuted,
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  countText: {
    fontFamily: AppFonts.psuBold,
    fontSize: 12,
    color: c.textMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  rowBordered: { borderTopWidth: 1, borderTopColor: c.border },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 9999,
    backgroundColor: c.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 9999,
  },
  info: { flex: 1, gap: 2 },
  name: {
    fontFamily: AppFonts.psuBold,
    fontSize: 15,
    lineHeight: 20,
    color: c.text,
  },
  subtitle: {
    fontFamily: AppFonts.psuRegular,
    fontSize: 13,
    color: c.textMuted,
  },
  empty: {
    fontFamily: AppFonts.psuRegular,
    fontSize: 14,
    color: c.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
});

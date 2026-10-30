import AsyncStorage from '@react-native-async-storage/async-storage';
import { Phone, Search } from 'lucide-react-native';
import { TEXT } from '@/constants/text';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { useContentBottomPadding } from "@/hooks/use-action-bar-padding";

import { NavTopBar } from '@/components/nav-top-bar';
import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PHOTO_BASE_URL } from '@/constants/endpoints';
import { AppFonts } from '@/constants/fonts';
import { useTheme } from '@/context/ThemeContext';
import type { Person } from '@/models/types';
import { getPersonnelSuggestions } from '@/services/personService';
import { boxShadow } from '@/constants/shadows';
import {
  getInitial,
  getThaiNamePrefix,
  pickTone,
  splitHighlight,
  splitPhones,
  toPhotoStaffId,
} from '@/utils/person-search';

const SEARCH_DEBOUNCE_MS = 350;
const RECENT_KEYWORDS_KEY = '@person_search_recent_keywords';
const MAX_RECENT_KEYWORDS = 5;
const PAGE_SIZE = 10;

function getPersonLabel(person: Person): string {
  const r = person as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : '');
  const thParts = [str(r.P_NAME_TH), str(r.FNAME_TH), str(r.SNAME_TH)].filter(Boolean);
  const thName = thParts.join(' ');
  const enParts = [str(r.P_SNAME_ENG), str(r.FNAME_ENG), str(r.SNAME_ENG)].filter(Boolean);
  const enName = enParts.join(' ');
  return (
    str(r.name) ||
    str(r.fullName) ||
    str(r.displayName) ||
    str(r.nameTh) ||
    str(r.staffName) ||
    thName ||
    enName ||
    (person.staffId ? String(person.staffId) : '') ||
    '—'
  );
}

// The card puts the title (นาย/ผศ.) small in front of the name, so it is kept
// apart from the first and last name the keyword is matched in.
function getPersonNameParts(person: Person): { prefix: string; name: string } {
  const r = person as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : '');
  const thName = [str(r.FNAME_TH), str(r.SNAME_TH)].filter(Boolean).join(' ');
  if (thName) return { prefix: getThaiNamePrefix(r), name: thName };
  const enName = [str(r.FNAME_ENG), str(r.SNAME_ENG)].filter(Boolean).join(' ');
  if (enName) return { prefix: str(r.P_SNAME_ENG), name: enName };
  return { prefix: '', name: getPersonLabel(person) };
}

function getPersonDetails(person: Person): {
  dept?: string;
  section?: string;
  phone?: string;
  fallback?: string;
} {
  const r = person as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : '');
  const phone =
    str(r.OFFICE_TEL) ||
    str(r.officeTel) ||
    str(r.phone) ||
    str(r.tel);
  const dept =
    str(r.department) ||
    str(r.deptName) ||
    str(r.faculty) ||
    str(r.DEPT_NAME_TH);
  // The work group under the department ("กลุ่มงาน…"). The search response is
  // not known to carry one under a fixed name, so the chip only shows when one
  // of these is present.
  const section =
    str(r.section) ||
    str(r.sectionName) ||
    str(r.SECTION_NAME_TH) ||
    str(r.WORK_NAME_TH) ||
    str(r.UNIT_NAME_TH) ||
    str(r.GROUP_NAME_TH);
  const id = person.staffId ? String(person.staffId) : '';
  return {
    dept: dept || undefined,
    section: section && section !== dept ? section : undefined,
    phone: phone || undefined,
    fallback: id || undefined,
  };
}

/** A photo the search response carried inline (data URI / URL), if any. */
function getPersonResponsePhoto(person: Person) {
  const photo = (person as Record<string, unknown>).photo;

  if (typeof photo === 'string' && photo.trim()) {
    const value = photo.trim();
    if (/^(data:|https?:\/\/|file:|content:|asset:)/i.test(value)) {
      return value;
    }
    return `data:image/jpeg;base64,${value}`;
  }

  if (photo && typeof photo === 'object') {
    const record = photo as Record<string, unknown>;
    const uri = record.uri || record.url || record.src;
    const base64 = record.base64 || record.data;

    if (typeof uri === 'string' && uri.trim()) {
      return uri.trim();
    }

    if (typeof base64 === 'string' && base64.trim()) {
      return `data:image/jpeg;base64,${base64.trim()}`;
    }
  }

  return '';
}

/**
 * Photo sources to try in order: the staff photo endpoint
 * (`.../personnel/v1/photo/{STAFF_ID}.jpg`) first, then whatever the search
 * response carried. When every source fails the initial stays showing.
 */
function getPersonPhotoSources(person: Person): string[] {
  const record = person as Record<string, unknown>;
  // STAFF_ID (7 digits) is the photo key; UNI_STAFF_ID — what `staffId` is
  // normalized from — stays as a fallback for rows where the two differ.
  const ids = [record.STAFF_ID, record.UNI_STAFF_ID, person.staffId].map(toPhotoStaffId);
  const sources = [
    ...ids.map((id) => (id ? `${PHOTO_BASE_URL}${encodeURIComponent(id)}.jpg` : '')),
    getPersonResponsePhoto(person),
  ].filter(Boolean);
  return Array.from(new Set(sources));
}

function getPersonSearchKey(person: Person, index: number) {
  const record = person as Record<string, unknown>;
  const parts = [
    person.staffId,
    record.EMAIL,
    record.email,
    record.FNAME_TH,
    record.SNAME_TH,
    record.FNAME_ENG,
    record.SNAME_ENG,
    index,
  ]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean);

  return parts.length ? parts.join('-') : `person-${index}`;
}

/**
 * Draws `text` with every run that matches what the reader typed marked, so it
 * is plain why this person came back for that keyword.
 */
function HighlightedText({
  text,
  keyword,
  style,
  numberOfLines,
}: {
  text: string;
  keyword: string;
  style: object;
  numberOfLines?: number;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <ThemedText style={style} numberOfLines={numberOfLines}>
      {splitHighlight(text, keyword).map((part, index) =>
        part.match ? (
          // Plain Text so the run inherits the parent's size and line height —
          // ThemedText would reset it to its own 14pt default.
          <Text key={index} style={styles.highlight}>
            {part.text}
          </Text>
        ) : (
          part.text
        ),
      )}
    </ThemedText>
  );
}

const AVATAR_TONES = (c: AppColors) => [
  { bg: c.primarySoft, fg: c.primary },
  { bg: c.infoSoft, fg: c.infoOnSoft },
  { bg: c.successSoft, fg: c.successOnSoft },
  { bg: c.warningSoft, fg: c.warningOnSoft },
];

function PersonSearchListItem({ item, keyword }: { item: Person; keyword: string }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const photoSources = getPersonPhotoSources(item);
  const photoKey = photoSources.join('|');
  const [photoIndex, setPhotoIndex] = useState(0);
  const photoUri = photoSources[photoIndex] ?? '';

  useEffect(() => {
    setPhotoIndex(0);
  }, [photoKey]);

  const { prefix, name } = getPersonNameParts(item);
  const details = getPersonDetails(item);
  const phones = details.phone ? splitPhones(details.phone) : [];
  const showPhoto = Boolean(photoUri);
  const tones = AVATAR_TONES(c);
  const tone = tones[pickTone(String(item.staffId ?? name), tones.length)];

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.avatarWrap, { backgroundColor: tone.bg }]}>
          {/* The initial sits underneath; a photo that loads covers it, one that
              404s is dropped and leaves the initial showing. */}
          <ThemedText style={[styles.avatarInitial, { color: tone.fg }]}>{getInitial(name)}</ThemedText>
          {showPhoto ? (
            <Image
              accessibilityIgnoresInvertColors
              contentFit="cover"
              onError={() => {
                setPhotoIndex((current) => current + 1);
              }}
              source={{ uri: photoUri }}
              style={styles.avatar}
              transition={200}
            />
          ) : null}
        </View>
        <View style={styles.listItemText}>
          <View style={styles.nameRow}>
            {prefix ? <ThemedText style={styles.namePrefix}>{prefix}</ThemedText> : null}
            <HighlightedText text={name} keyword={keyword} style={styles.name} numberOfLines={2} />
          </View>
          {details.dept ? (
            <HighlightedText
              text={details.dept}
              keyword={keyword}
              style={styles.metaText}
              numberOfLines={2}
            />
          ) : null}
          {details.section ? (
            <View style={styles.sectionChip}>
              <HighlightedText
                text={details.section}
                keyword={keyword}
                style={styles.sectionChipText}
                numberOfLines={1}
              />
            </View>
          ) : null}
          {!details.dept && !phones.length && details.fallback && details.fallback !== name ? (
            <ThemedText style={styles.subtitle} numberOfLines={1}>
              {details.fallback}
            </ThemedText>
          ) : null}
        </View>
      </View>

      {phones.length ? (
        <View style={styles.phoneRow}>
          <ThemedText style={styles.phoneLabel}>{TEXT.PERSON_SEARCH_EXTENSION}</ThemedText>
          <View style={styles.phoneButtons}>
            {phones.map((phone) => (
              <Pressable
                key={phone}
                accessibilityRole="button"
                accessibilityLabel={`${TEXT.PERSON_SEARCH_CALL} ${phone}`}
                onPress={() => {
                  Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`).catch(() => {});
                }}
                style={({ pressed }) => [styles.phoneButton, pressed && styles.keywordBadgePressed]}
              >
                <Phone size={12} color={c.primary} />
                <ThemedText style={styles.phoneButtonText}>{phone}</ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export default function PersonSearchScreen() {
  const c = useColors();
  const contentBottomPadding = useContentBottomPadding(16);
  const { isDarkMode } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<Person[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentKeywords, setRecentKeywords] = useState<string[]>([]);
  const requestIdRef = useRef(0);

  useEffect(() => {
    AsyncStorage.getItem(RECENT_KEYWORDS_KEY).then((stored) => {
      if (!stored) return;
      try {
        const parsed = JSON.parse(stored) as string[];
        if (Array.isArray(parsed)) {
          setRecentKeywords(parsed.slice(0, MAX_RECENT_KEYWORDS));
        }
      } catch {}
    });
  }, []);

  const saveKeyword = useCallback((term: string) => {
    const trimmed = term.trim();
    if (trimmed.length < 2) return;
    setRecentKeywords((prev) => {
      const next = [trimmed, ...prev.filter((k) => k !== trimmed)].slice(0, MAX_RECENT_KEYWORDS);
      AsyncStorage.setItem(RECENT_KEYWORDS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const runSearch = useCallback(
    (trimmed: string) => {
      const id = ++requestIdRef.current;
      setIsLoading(true);
      setError(null);

      getPersonnelSuggestions(trimmed)
        .then((data) => {
          if (id !== requestIdRef.current) return;
          setResults(data);
          setVisibleCount(PAGE_SIZE);
          saveKeyword(trimmed);
        })
        .catch((searchError) => {
          if (id !== requestIdRef.current) return;
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[person-search] search failed', searchError);
          }
          setResults([]);
          setError(TEXT.SHARED_SOMETHING_WENT_WRONG);
        })
        .finally(() => {
          if (id !== requestIdRef.current) return;
          setIsLoading(false);
        });
    },
    [saveKeyword],
  );

  useEffect(() => {
    const trimmed = keyword.trim();

    if (trimmed.length < 2) {
      requestIdRef.current += 1;
      setResults([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      runSearch(trimmed);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [keyword, runSearch]);

  const handleRetry = () => {
    const trimmed = keyword.trim();
    if (trimmed.length < 2) return;
    runSearch(trimmed);
  };

  const handleBadgePress = (term: string) => {
    setKeyword(term);
  };

  const trimmedLength = keyword.trim().length;
  const visibleResults = results.slice(0, visibleCount);
  const hasMore = visibleCount < results.length;

  const loadMore = () => {
    if (hasMore) {
      setVisibleCount((prev) => prev + PAGE_SIZE);
    }
  };

  const renderEmpty = () => {
    if (isLoading) {
      return null;
    }
    if (error) {
      return (
        <View style={styles.errorBox}>
          <ThemedText style={styles.errorTitle}>{TEXT.SHARED_UNABLE_TO_COMPLETE}</ThemedText>
          <ThemedText style={styles.errorDetail}>{error}</ThemedText>
          <Pressable style={styles.retryBtn} onPress={handleRetry}>
            <ThemedText style={styles.retryBtnText}>{TEXT.SHARED_RETRY}</ThemedText>
          </Pressable>
        </View>
      );
    }
    // Before a search has been made this is a prompt, not a result — it keeps
    // the plain glyph, because a "nothing found" drawing would be answering a
    // question the reader has not asked yet.
    if (trimmedLength < 2) {
      return <EmptyState icon={Search} tone="quiet" message={TEXT.PERSON_SEARCH_PROMPT} />;
    }
    // A search that came back with nothing: quote the words back, so the reader
    // can see it was their spelling that was searched for and not something the
    // screen invented.
    return (
      <EmptyState
        preset="search"
        message={`${TEXT.PERSON_SEARCH_NO_RESULT} “${keyword.trim()}”`}
        description={TEXT.PERSON_SEARCH_NO_RESULT_HINT}
      />
    );
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <NavTopBar
        title={TEXT.PERSON_SEARCH_TITLE}
        backHref="/"
        showHomeButton={false}
        tone="primary"
      />

      <View style={styles.content}>
        {/* Search field */}
        <View style={styles.searchCard}>
          <Search size={18} color={c.textMuted} />
          <TextInput
            accessibilityLabel={TEXT.SHARED_SEARCH_NAME_PLACEHOLDER}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            onChangeText={setKeyword}
            placeholder={TEXT.SHARED_SEARCH_NAME_PLACEHOLDER}
            placeholderTextColor={c.textFaint}
            returnKeyType="search"
            // react-native-web draws a black focus outline on inputs; remove it.
            style={[styles.input, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
            value={keyword}
          />
          {isLoading ? <ActivityIndicator color={c.primary} size="small" /> : null}
        </View>

        {/* Recent keywords */}
        {recentKeywords.length > 0 ? (
          <ScrollView
            horizontal
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.keywordsContent}
            style={styles.keywordsRow}
          >
            {recentKeywords.map((term) => (
              <Pressable
                key={term}
                accessibilityRole="button"
                onPress={() => handleBadgePress(term)}
                style={({ pressed }) => [
                  styles.keywordBadge,
                  term === keyword.trim() && styles.keywordBadgeActive,
                  pressed && styles.keywordBadgePressed,
                ]}
              >
                <ThemedText
                  style={[
                    styles.keywordBadgeText,
                    term === keyword.trim() && styles.keywordBadgeTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {term}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {/* Results — each person is its own card, listed one by one */}
        <FlatList
          style={styles.flatList}
          contentContainerStyle={[styles.listContent, { paddingBottom: contentBottomPadding }]}
          data={visibleResults}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          keyExtractor={getPersonSearchKey}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={renderEmpty()}
          ListFooterComponent={
            results.length > PAGE_SIZE ? (
              <ThemedText style={styles.countFooter}>
                {`${visibleResults.length} / ${results.length}`}
              </ThemedText>
            ) : null
          }
          ListHeaderComponent={
            visibleResults.length ? (
              <ThemedText style={styles.resultsLabel}>
                {`${TEXT.PERSON_SEARCH_RESULTS_FOR} “${keyword.trim()}”`}
              </ThemedText>
            ) : null
          }
          renderItem={({ item }) => <PersonSearchListItem item={item} keyword={keyword} />}
        />
      </View>
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  pageTitle: {
    fontSize: 26,
    lineHeight: 36,
    color: c.text,
    fontFamily: AppFonts.psuBold,
    marginBottom: 16,
  },

  // ─── Search field ────────────────────────────────────────────────
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    paddingHorizontal: 16,
    backgroundColor: c.surface,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    boxShadow: boxShadow(c.shadow, { y: 3, blur: 10, opacity: 0.06 }),
  },
  input: {
    flex: 1,
    height: '100%',
    color: c.text,
    fontFamily: AppFonts.psuRegular,
    fontSize: 15,
    paddingVertical: 0,
  },

  // ─── Recent keywords ─────────────────────────────────────────────
  keywordsRow: {
    marginTop: 14,
    marginBottom: 16,
    marginHorizontal: -16,
    maxHeight: 34,
  },
  keywordsContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  keywordBadge: {
    height: 32,
    minWidth: 72,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: c.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keywordBadgeActive: {
    backgroundColor: c.primary,
  },
  keywordBadgePressed: {
    opacity: 0.82,
  },
  keywordBadgeText: {
    fontSize: 13,
    lineHeight: 17,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
  },
  keywordBadgeTextActive: {
    color: c.textOnPrimary,
  },

  // ─── Results list ────────────────────────────────────────────────
  flatList: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingTop: 16,
    paddingBottom: 16,
  },
  separator: {
    height: 12,
  },
  countFooter: {
    paddingTop: 16,
    paddingBottom: 4,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
    color: c.textFaint,
    fontFamily: AppFonts.psuRegular,
  },

  resultsLabel: {
    marginBottom: 8,
    fontSize: 12,
    lineHeight: 16,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
  },

  // ─── Person card ─────────────────────────────────────────────────
  card: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: c.surface,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    boxShadow: boxShadow(c.shadow, { y: 2, blur: 8, opacity: 0.04 }),
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: AppFonts.psuBold,
  },
  avatar: {
    ...StyleSheet.absoluteFill,
  },
  listItemText: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 2,
  },
  namePrefix: {
    fontSize: 13,
    lineHeight: 20,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
  },
  name: {
    flexShrink: 1,
    fontSize: 15,
    lineHeight: 20,
    color: c.text,
    fontFamily: AppFonts.psuBold,
  },
  // The keyword the reader typed, wherever it shows up in a card.
  highlight: {
    backgroundColor: c.primarySoft,
    color: c.primary,
    fontFamily: AppFonts.psuBold,
    borderRadius: 4,
  },
  sectionChip: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: c.surfaceAlt,
  },
  sectionChipText: {
    fontSize: 11,
    lineHeight: 16,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  phoneLabel: {
    fontSize: 11,
    lineHeight: 16,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
  },
  phoneButtons: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: c.surfaceAlt,
  },
  phoneButtonText: {
    fontSize: 12,
    lineHeight: 17,
    color: c.primary,
    fontFamily: AppFonts.psuBold,
  },
  metaText: {
    fontSize: 13,
    lineHeight: 19,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 17,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
  },

  // ─── Error ───────────────────────────────────────────────────────
  errorBox: {
    margin: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.primarySoft,
    padding: 16,
    gap: 6,
  },
  errorTitle: {
    color: c.primary,
    fontFamily: AppFonts.psuBold,
    fontSize: 14,
    lineHeight: 20,
  },
  errorDetail: {
    color: c.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: c.pomegranate,
  },
  retryBtnText: {
    color: c.textOnPrimary,
    fontFamily: AppFonts.psuBold,
    fontSize: 14,
    lineHeight: 20,
  },
});

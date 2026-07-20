import AsyncStorage from '@react-native-async-storage/async-storage';
import { Building2, Phone, Search, SearchX } from 'lucide-react-native';
import { TEXT } from '@/constants/text';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

import { NavTopBar } from '@/components/nav-top-bar';
import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppFonts } from '@/constants/fonts';
import { useTheme } from '@/context/ThemeContext';
import type { Person } from '@/models/types';
import { getPersonnelSuggestions } from '@/services/personService';

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

function getPersonDetails(person: Person): {
  dept?: string;
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
  const id = person.staffId ? String(person.staffId) : '';
  return {
    dept: dept || undefined,
    phone: phone || undefined,
    fallback: id || undefined,
  };
}

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

function PersonSearchListItem({ item }: { item: Person }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const [photoFailed, setPhotoFailed] = useState(false);
  const photoUri = getPersonResponsePhoto(item);

  useEffect(() => {
    setPhotoFailed(false);
  }, [photoUri]);

  const title = getPersonLabel(item);
  const details = getPersonDetails(item);
  const showPhoto = Boolean(photoUri) && !photoFailed;

  return (
    <View style={styles.listItemRow}>
      <View style={styles.avatarWrap}>
        {showPhoto ? (
          <Image
            accessibilityIgnoresInvertColors
            contentFit="cover"
            onError={() => {
              setPhotoFailed(true);
            }}
            source={{ uri: photoUri }}
            style={styles.avatar}
            transition={200}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]} />
        )}
      </View>
      <View style={styles.listItemText}>
        <ThemedText style={styles.name} numberOfLines={2}>
          {title}
        </ThemedText>
        {details.dept ? (
          <View style={styles.metaRow}>
            <Building2 size={12} color={c.textMuted} style={styles.metaIcon} />
            <ThemedText style={styles.metaText} numberOfLines={2}>
              {details.dept}
            </ThemedText>
          </View>
        ) : null}
        {details.phone ? (
          <View style={styles.metaRow}>
            <Phone size={12} color={c.textMuted} style={styles.metaIcon} />
            <ThemedText style={styles.metaText} numberOfLines={1}>
              {details.phone}
            </ThemedText>
          </View>
        ) : null}
        {!details.dept && !details.phone && details.fallback && details.fallback !== title ? (
          <ThemedText style={styles.subtitle} numberOfLines={1}>
            {details.fallback}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

export default function PersonSearchScreen() {
  const c = useColors();
  const { isDarkMode } = useTheme();
  const { height } = useWindowDimensions();
  const styles = useThemedStyles(makeStyles);
  // Scale the screen title with the device height (clamped) so it feels
  // proportional on both short and tall screens.
  const titleSize = Math.round(Math.min(26, Math.max(20, height * 0.028)));
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
    if (trimmedLength < 2) {
      return <EmptyState icon={Search} message={TEXT.PERSON_SEARCH_SUBTITLE} />;
    }
    return <EmptyState icon={SearchX} message={TEXT.SHARED_EMPTY_DATA} />;
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <NavTopBar
        title=""
        backHref="/"
        backgroundColor={c.background}
        contentColor={c.text}
      />

      <View style={styles.content}>
        <ThemedText style={[styles.pageTitle, { fontSize: titleSize, lineHeight: titleSize + 6 }]}>
          {TEXT.PERSON_SEARCH_TITLE}
        </ThemedText>

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
            style={styles.input}
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
            {recentKeywords.map((term, index) => (
              <Pressable
                key={term}
                accessibilityRole="button"
                onPress={() => handleBadgePress(term)}
                style={({ pressed }) => [
                  styles.keywordBadge,
                  index === 0 && styles.keywordBadgeActive,
                  pressed && styles.keywordBadgePressed,
                ]}
              >
                <ThemedText
                  style={[
                    styles.keywordBadgeText,
                    index === 0 && styles.keywordBadgeTextActive,
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
          contentContainerStyle={styles.listContent}
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
          renderItem={({ item }) => <PersonSearchListItem item={item} />}
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
    paddingTop: 8,
  },
  pageTitle: {
    fontSize: 26,
    lineHeight: 32,
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
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 1,
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

  // ─── Person card ─────────────────────────────────────────────────
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: c.surface,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 1,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: c.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  avatar: {
    width: 48,
    height: 48,
  },
  avatarPlaceholder: {
    backgroundColor: c.surfaceMuted,
  },
  listItemText: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  name: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 3,
    color: c.text,
    fontFamily: AppFonts.psuBold,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginTop: 3,
  },
  metaIcon: {
    marginTop: 3,
  },
  metaText: {
    flex: 1,
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
    backgroundColor: c.primary,
  },
  retryBtnText: {
    color: c.textOnPrimary,
    fontFamily: AppFonts.psuBold,
    fontSize: 14,
    lineHeight: 20,
  },
});

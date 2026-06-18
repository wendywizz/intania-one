import AsyncStorage from '@react-native-async-storage/async-storage';
import { Search } from 'lucide-react-native';
import { TEXT } from '@/constants/text';
import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppFonts } from '@/constants/fonts';
import type { Person } from '@/models/types';
import { getPersonnelSuggestions } from '@/services/personService';

const SEARCH_DEBOUNCE_MS = 350;
const RECENT_KEYWORDS_KEY = '@person_search_recent_keywords';
const MAX_RECENT_KEYWORDS = 5;

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
    phone: phone ? `Tel: ${phone}` : undefined,
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
        <ThemedText type="defaultSemiBold" numberOfLines={2}>
          {title}
        </ThemedText>
        {details.dept ? (
          <ThemedText style={styles.subtitle} numberOfLines={2}>
            {details.dept}
          </ThemedText>
        ) : null}
        {details.phone ? (
          <ThemedText style={styles.subtitle} numberOfLines={1}>
            {details.phone}
          </ThemedText>
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
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<Person[]>([]);
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
  const showEmptyHint = trimmedLength >= 2 && !isLoading && !error && results.length === 0;

  return (
    <ThemedView style={styles.container}>
      <NavTopBar title={TEXT.PERSON_SEARCH_TITLE} />

      <View style={styles.searchRow}>
        <View style={styles.inputWrap}>
          <View pointerEvents="none" style={styles.searchIconWrap}>
            <Search size={22} color="#8A969C" />
          </View>
          <TextInput
            accessibilityLabel={TEXT.SHARED_SEARCH_NAME_PLACEHOLDER}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            onChangeText={setKeyword}
            placeholder="Search by name or Department"
            placeholderTextColor="#8A969C"
            returnKeyType="search"
            style={styles.input}
            value={keyword}
          />
          <View pointerEvents="none" style={styles.spinnerWrap}>
            {isLoading ? <ActivityIndicator color="#B33939" size="small" /> : null}
          </View>
        </View>
      </View>

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
              style={({ pressed }) => [styles.keywordBadge, pressed && styles.keywordBadgePressed]}
            >
              <ThemedText style={styles.keywordBadgeText} numberOfLines={1}>
                {term}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {error ? (
        <View style={styles.errorBlock}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <Pressable accessibilityRole="button" onPress={handleRetry} style={styles.retryButton}>
            <ThemedText lightColor="#B33939" darkColor="#B33939" type="defaultSemiBold">
              {TEXT.SHARED_RETRY}
            </ThemedText>
          </Pressable>
        </View>
      ) : null}

      <View style={[styles.resultsArea, (results.length > 0 || showEmptyHint) && styles.resultsCard]}>
        <FlatList
          style={styles.flatList}
          contentContainerStyle={styles.listContent}
          data={results}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          keyExtractor={getPersonSearchKey}
          ListEmptyComponent={
            showEmptyHint ? (
              <ThemedText style={styles.emptyText}>{TEXT.SHARED_EMPTY_DATA}</ThemedText>
            ) : null
          }
          renderItem={({ item }) => <PersonSearchListItem item={item} />}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FD',
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  inputWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  searchIconWrap: {
    position: 'absolute',
    left: 12,
    top: 0,
    bottom: 0,
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  input: {
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8ECF0',
    color: '#11181C',
    fontFamily: AppFonts.psuRegular,
    fontSize: 14,
    paddingLeft: 44,
    paddingRight: 42,
    paddingVertical: 10,
  },
  spinnerWrap: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keywordsRow: {
    paddingBottom: 8,
  },
  keywordsContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  keywordBadge: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8ECF0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keywordBadgePressed: {
    backgroundColor: '#F2F3F7',
  },
  keywordBadgeText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#444D5B',
    fontFamily: AppFonts.psuRegular,
  },
  resultsArea: {
    flex: 2,
    marginHorizontal: 16,
    marginTop: 8,
  },
  resultsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  flatList: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 8,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    backgroundColor: '#E1E2E6',
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#F2F3F7',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8ECF0',
    marginTop: 1,
  },
  avatar: {
    width: 48,
    height: 48,
  },
  avatarPlaceholder: {
    backgroundColor: '#E8ECF0',
  },
  listItemText: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'flex-start',
    alignSelf: 'flex-start',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: '#687076',
  },
  emptyText: {
    marginTop: 24,
    textAlign: 'center',
    color: '#687076',
    fontSize: 14,
  },
  errorBlock: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  errorText: {
    color: '#B33939',
    fontSize: 14,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
});

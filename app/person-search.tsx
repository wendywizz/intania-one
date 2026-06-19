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
      <NavTopBar title="Search Person" />

      <View style={styles.content}>
        <View style={styles.inputWrap}>
          <View pointerEvents="none" style={styles.searchIconWrap}>
            <Search size={18} color="#8A969C" />
          </View>
          <TextInput
            accessibilityLabel={TEXT.SHARED_SEARCH_NAME_PLACEHOLDER}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            onChangeText={setKeyword}
            placeholder="Search by name or department..."
            placeholderTextColor="#8A969C"
            returnKeyType="search"
            style={styles.input}
            value={keyword}
          />
          <View pointerEvents="none" style={styles.spinnerWrap}>
            {isLoading ? <ActivityIndicator color="#B33939" size="small" /> : null}
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
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7FA',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  inputWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  searchIconWrap: {
    position: 'absolute',
    left: 14,
    top: 0,
    bottom: 0,
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  input: {
    height: 48,
    borderRadius: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E7EC',
    color: '#11181C',
    fontFamily: AppFonts.psuRegular,
    fontSize: 13,
    paddingLeft: 42,
    paddingRight: 42,
    paddingVertical: 0,
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
    marginTop: 14,
    marginHorizontal: -16,
    maxHeight: 34,
  },
  keywordsContent: {
    paddingHorizontal: 16,
    gap: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  keywordBadge: {
    height: 30,
    minWidth: 76,
    paddingHorizontal: 16,
    borderRadius: 15,
    backgroundColor: '#EEF0F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keywordBadgeActive: {
    backgroundColor: '#9E1F20',
  },
  keywordBadgePressed: {
    opacity: 0.82,
  },
  keywordBadgeText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#6A6F78',
    fontFamily: AppFonts.psuRegular,
  },
  keywordBadgeTextActive: {
    color: '#FFFFFF',
  },
  resultsArea: {
    marginTop: 22,
    flexGrow: 0,
    flexShrink: 1,
  },
  resultsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ECEEF3',
    maxHeight: '72%',
  },
  flatList: {},
  listContent: {
    paddingVertical: 0,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 82,
    backgroundColor: '#E7E8EC',
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 78,
    paddingVertical: 8,
    paddingHorizontal: 13,
    gap: 12,
  },
  avatarWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    overflow: 'hidden',
    backgroundColor: '#F2F3F7',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8ECF0',
  },
  avatar: {
    width: 58,
    height: 58,
  },
  avatarPlaceholder: {
    backgroundColor: '#E8ECF0',
  },
  listItemText: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  subtitle: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 14,
    color: '#687076',
  },
  emptyText: {
    marginVertical: 22,
    textAlign: 'center',
    color: '#687076',
    fontSize: 14,
  },
  errorBlock: {
    paddingTop: 14,
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

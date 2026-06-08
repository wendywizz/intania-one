import { TEXT } from '@/constants/text';
import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
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
  const requestIdRef = useRef(0);

  const runSearch = useCallback((trimmed: string) => {
    const id = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    getPersonnelSuggestions(trimmed)
      .then((data) => {
        if (id !== requestIdRef.current) {
          return;
        }
        setResults(data);
      })
      .catch((searchError) => {
        if (id !== requestIdRef.current) {
          return;
        }
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[person-search] search failed', searchError);
        }
        setResults([]);
        setError(TEXT.SHARED_SOMETHING_WENT_WRONG);
      })
      .finally(() => {
        if (id !== requestIdRef.current) {
          return;
        }
        setIsLoading(false);
      });
  }, []);

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
    if (trimmed.length < 2) {
      return;
    }
    runSearch(trimmed);
  };

  const trimmedLength = keyword.trim().length;
  const showEmptyHint = trimmedLength >= 2 && !isLoading && !error && results.length === 0;

  return (
    <ThemedView style={styles.container}>
      <NavTopBar title={TEXT.PERSON_SEARCH_TITLE} />

      <View style={styles.searchRow}>
        <View style={styles.inputWrap}>
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
            {isLoading ? <ActivityIndicator color="#0A6E8A" size="small" /> : null}
          </View>
        </View>
      </View>

      {error ? (
        <View style={styles.errorBlock}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <Pressable accessibilityRole="button" onPress={handleRetry} style={styles.retryButton}>
            <ThemedText lightColor="#0A6E8A" darkColor="#0A6E8A" type="defaultSemiBold">
              {TEXT.SHARED_RETRY}
            </ThemedText>
          </Pressable>
        </View>
      ) : null}

      <FlatList
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchRow: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  inputWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#BFD2DA',
    backgroundColor: '#FFFFFF',
    color: '#11181C',
    fontFamily: AppFonts.psuRegular,
    fontSize: 14,
    paddingHorizontal: 14,
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
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    flexGrow: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#D7E6EC',
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#E8EEF1',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D7E6EC',
  },
  avatar: {
    width: 48,
    height: 48,
  },
  avatarPlaceholder: {
    backgroundColor: '#D7E6EC',
  },
  listItemText: {
    flex: 1,
    minWidth: 0,
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
    paddingHorizontal: 24,
    paddingBottom: 8,
    gap: 8,
  },
  errorText: {
    color: '#C44D58',
    fontSize: 14,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
});

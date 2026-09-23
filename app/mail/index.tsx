import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import { Search, X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { InfinityLoader } from '@/components/infinity-loader';
import { LoadingAnimate } from '@/components/loading-animate';
import { MailMockBanner } from '@/components/mail/mock-banner';
import { SenderAvatar } from '@/components/mail/sender-avatar';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedView } from '@/components/themed-view';
import { ListCard } from '@/components/ui/list-card';
import { AppFonts } from '@/constants/fonts';
import { boxShadow } from '@/constants/shadows';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import * as mailAuthService from '@/services/mailAuthService';
import {
  assertMailModuleEnabled,
  listInboxMessages,
  searchInboxMessages,
  type MailMessage,
} from '@/services/mailService';
import { formatNewsDateTime } from '@/utils/date-format';

const SEARCH_DEBOUNCE_MS = 350;

function MailCard({ message }: { message: MailMessage }) {
  const c = useColors();
  const isRead = message.isRead;
  const senderName = message.from.name || message.from.address || TEXT.MAIL_UNKNOWN_SENDER;

  return (
    <ListCard
      onPress={() => router.push({ pathname: '/mail/detail', params: { id: message.id } })}
      icon={<SenderAvatar name={message.from.name} address={message.from.address} size={40} />}
      iconBackground="transparent"
      title={message.subject || TEXT.MAIL_NO_SUBJECT}
      titleNumberOfLines={1}
      date={message.receivedDateTime ? formatNewsDateTime(message.receivedDateTime) : undefined}
      meta={[
        {
          // A small dot ahead of the sender's name — the closest read/unread
          // signal to iOS Mail's own blue dot — only spent on rows that need
          // it, so a read inbox stays visually quiet.
          icon: isRead ? undefined : <View style={[styles.unreadDot, { backgroundColor: c.primary }]} />,
          text: senderName,
        },
        { text: message.bodyPreview },
      ]}
    />
  );
}

export default function MailInboxScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);

  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [nextLink, setNextLink] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState('');

  // --- search --------------------------------------------------------------
  // A separate result set, not a client-side filter of `messages`: the list
  // only holds whatever pages have been scrolled into so far, so filtering it
  // in JS would silently miss every older message. `searchInboxMessages` asks
  // Graph's own full-text search instead — see services/mailService.ts.
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<MailMessage[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchRequestId = useRef(0);
  const isSearchMode = searchText.trim().length > 0;

  useEffect(() => {
    const trimmed = searchText.trim();

    if (!trimmed) {
      searchRequestId.current += 1;
      setSearchResults(null);
      setIsSearching(false);
      return undefined;
    }

    const id = ++searchRequestId.current;
    setIsSearching(true);

    const timeoutId = setTimeout(() => {
      searchInboxMessages(trimmed)
        .then((result) => {
          if (id !== searchRequestId.current) return;
          setSearchResults(result.messages);
        })
        .catch((err) => {
          if (id !== searchRequestId.current) return;
          if (err instanceof Error && mailAuthService.isMailReauthRequiredText(err.message)) {
            router.replace('/mail/connect');
            return;
          }
          setSearchResults([]);
        })
        .finally(() => {
          if (id !== searchRequestId.current) return;
          setIsSearching(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [searchText]);

  const displayedMessages = isSearchMode ? (searchResults ?? []) : messages;

  // --- load / refresh --------------------------------------------------------
  const loadMessages = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setIsLoading(true);
    setError('');

    try {
      const result = await listInboxMessages();
      setMessages(result.messages);
      setNextLink(result.nextLink);
    } catch (err) {
      if (err instanceof Error && mailAuthService.isMailReauthRequiredText(err.message)) {
        router.replace('/mail/connect');
        return;
      }
      setMessages([]);
      setError(err instanceof Error ? err.message : TEXT.MAIL_UNABLE_TO_LOAD);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // The module-switch check runs before anything else, connected or not: a
  // switched-off module has to show up even for someone already connected,
  // since their stored tokens are still fine — it is the module scooba says is
  // off, not their session. Pulled out on its own so the ErrorState's retry
  // button re-runs this whole sequence rather than skipping straight to
  // `loadMessages`, which would ignore the module still being off.
  const checkAndLoad = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      await assertMailModuleEnabled();
    } catch (err) {
      setIsLoading(false);
      setMessages([]);
      setError(err instanceof Error ? err.message : TEXT.MAIL_UNABLE_TO_LOAD);
      return;
    }

    const connected = await mailAuthService.isConnected();
    if (!connected) {
      router.replace('/mail/connect');
      return;
    }
    loadMessages();
  }, [loadMessages]);

  // Checked on every focus, not just on mount: this is what sends a first-time
  // visitor to /mail/connect and lets a later disconnect (e.g. sign-out) take
  // a returning visitor back there too, rather than only gating the initial
  // mount.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        if (!cancelled) await checkAndLoad();
      })();

      return () => {
        cancelled = true;
      };
    }, [checkAndLoad]),
  );

  const handleLoadMore = useCallback(async () => {
    if (!nextLink || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const result = await listInboxMessages({ nextLink });
      setMessages((prev) => [...prev, ...result.messages]);
      setNextLink(result.nextLink);
    } catch (err) {
      // Pagination failures don't need to interrupt an already-populated
      // list — pull-to-refresh is the retry. A reauth failure is the one
      // exception: nothing further down the list will load either.
      if (err instanceof Error && mailAuthService.isMailReauthRequiredText(err.message)) {
        router.replace('/mail/connect');
      }
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextLink, isLoadingMore]);

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="light" />
      <NavTopBar title={TEXT.MAIL_HEADER_TITLE} backHref="/" showHomeButton={false} tone="primary" />
      <View style={styles.content}>
        {isLoading && messages.length === 0 ? (
          <LoadingAnimate title={TEXT.MAIL_LOADING} desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT} />
        ) : error ? (
          <ErrorState
            title={TEXT.SHARED_SOMETHING_WENT_WRONG}
            message={error}
            onRetry={() => checkAndLoad()}
          />
        ) : (
          <>
            <MailMockBanner />
            <View style={styles.searchBar}>
              <Search size={17} color={c.textMuted} />
              <TextInput
                accessibilityLabel={TEXT.MAIL_SEARCH_PLACEHOLDER}
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setSearchText}
                placeholder={TEXT.MAIL_SEARCH_PLACEHOLDER}
                placeholderTextColor={c.textFaint}
                returnKeyType="search"
                value={searchText}
                // react-native-web draws a black focus outline on inputs; remove it.
                style={[styles.searchInput, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
              />
              {isSearching ? (
                <ActivityIndicator color={c.primary} size="small" />
              ) : searchText ? (
                <Pressable
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => setSearchText('')}
                >
                  <View style={[styles.clearButton, { backgroundColor: c.surfaceMuted }]}>
                    <X size={12} color={c.textMuted} />
                  </View>
                </Pressable>
              ) : null}
            </View>

            <FlatList
              style={styles.flatList}
              contentContainerStyle={styles.listContent}
              data={displayedMessages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <MailCard message={item} />}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              refreshControl={
                isSearchMode ? undefined : (
                  <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={() => loadMessages(true)}
                    tintColor={c.primary}
                    colors={[c.primary]}
                  />
                )
              }
              onEndReached={isSearchMode ? undefined : handleLoadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                isLoadingMore ? (
                  <View style={styles.footer}>
                    <InfinityLoader size={44} strokeWidth={4} />
                  </View>
                ) : null
              }
              ListEmptyComponent={
                isSearchMode ? (
                  isSearching ? null : (
                    <EmptyState
                      preset="search"
                      message={`${TEXT.MAIL_SEARCH_NO_RESULT} “${searchText.trim()}”`}
                      description={TEXT.MAIL_SEARCH_NO_RESULT_HINT}
                    />
                  )
                ) : (
                  <EmptyState preset="cleared" message={TEXT.MAIL_INBOX_EMPTY} />
                )
              }
            />
          </>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  unreadDot: { width: 7, height: 7, borderRadius: 3.5 },
});

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 42,
    paddingHorizontal: 14,
    marginBottom: 10,
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    boxShadow: boxShadow(c.shadow, { y: 2, blur: 8, opacity: 0.04 }),
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: c.text,
    fontFamily: AppFonts.psuRegular,
    fontSize: 14.5,
    paddingVertical: 0,
  },
  clearButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flatList: { flex: 1 },
  listContent: { flexGrow: 1, paddingTop: 4, paddingBottom: 24 },
  footer: { paddingVertical: 20, alignItems: 'center' },
});

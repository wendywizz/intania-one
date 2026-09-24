import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { InfinityLoader } from '@/components/infinity-loader';
import { LoadingAnimate } from '@/components/loading-animate';
import { MAIL_BOTTOM_BAR_SPACE, MailBottomBar } from '@/components/mail/mail-bottom-bar';
import { MailFilterSheet } from '@/components/mail/mail-filter-sheet';
import { MailFolderChips } from '@/components/mail/mail-folder-chips';
import { MailMockBanner } from '@/components/mail/mock-banner';
import { SenderAvatar } from '@/components/mail/sender-avatar';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ListCard } from '@/components/ui/list-card';
import { AppFonts } from '@/constants/fonts';
import {
  MAIL_READ_FILTER_LABEL,
  getMailFolder,
  type MailFolderKey,
  type MailReadFilter,
} from '@/constants/mailFolders';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import * as mailAuthService from '@/services/mailAuthService';
import {
  applyReadFilter,
  checkMailModule,
  getInboxUnreadCount,
  listMessages,
  searchMessages,
  type MailMessage,
} from '@/services/mailService';
import { formatNewsDateTime } from '@/utils/date-format';

const SEARCH_DEBOUNCE_MS = 350;

function isReauth(error: unknown) {
  return error instanceof Error && mailAuthService.isMailReauthRequiredText(error.message);
}

function MailCard({
  message,
  showsRecipients,
  onPress,
}: {
  message: MailMessage;
  showsRecipients: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  const recipientNames = message.toRecipients.map((r) => r.name || r.address).filter(Boolean);
  // Sent Items and Drafts name who it is going to — the sender is always you.
  const person = showsRecipients ? (message.toRecipients[0] ?? { name: '', address: '' }) : message.from;
  const personLine = showsRecipients
    ? `${TEXT.MAIL_TO_PREFIX} ${recipientNames.join(', ') || TEXT.MAIL_NO_RECIPIENT}`
    : message.from.name || message.from.address || TEXT.MAIL_UNKNOWN_SENDER;
  // Something you sent or are still writing can't be "unread".
  const showUnread = !message.isRead && !showsRecipients;

  return (
    <ListCard
      onPress={onPress}
      icon={<SenderAvatar name={person.name} address={person.address} size={40} />}
      iconBackground="transparent"
      title={message.subject || TEXT.MAIL_NO_SUBJECT}
      titleNumberOfLines={1}
      date={message.receivedDateTime ? formatNewsDateTime(message.receivedDateTime) : undefined}
      badge={message.isDraft ? { text: TEXT.MAIL_DRAFT_BADGE, bg: c.dangerSoft, color: c.dangerOnSoft } : null}
      meta={[
        {
          // The closest thing to iOS Mail's blue dot, spent only on rows that
          // need it, so a read inbox stays visually quiet.
          icon: showUnread ? <View style={[staticStyles.unreadDot, { backgroundColor: c.primary }]} /> : undefined,
          text: personLine,
        },
        { text: message.bodyPreview },
      ]}
    />
  );
}

export default function MailInboxScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();

  // --- module state ------------------------------------------------------------
  const [isReady, setIsReady] = useState(false);
  const [moduleError, setModuleError] = useState('');
  const [composeEnabled, setComposeEnabled] = useState(mailAuthService.isMailComposeEnabled());
  const [accountEmail, setAccountEmail] = useState('');

  // --- folder / filter -----------------------------------------------------------
  // Mirrored in refs so the focus effect can reload whatever is on screen
  // without re-subscribing every time either one changes.
  const [folder, setFolder] = useState<MailFolderKey>('inbox');
  const [filter, setFilter] = useState<MailReadFilter>('all');
  const folderRef = useRef<MailFolderKey>('inbox');
  const filterRef = useRef<MailReadFilter>('all');
  const [isFilterSheetVisible, setFilterSheetVisible] = useState(false);
  const folderInfo = getMailFolder(folder);

  // --- list ----------------------------------------------------------------------
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [nextLink, setNextLink] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [listError, setListError] = useState('');
  const [inboxUnread, setInboxUnread] = useState(0);
  // Guards against a slow answer for the folder you just left landing on top
  // of the one you switched to.
  const listRequestId = useRef(0);

  /**
   * - 'switch'  folder or filter changed: clear the list and show the loader
   * - 'quiet'   came back to the screen: keep what is shown until the new page arrives
   * - 'refresh' pull-to-refresh
   */
  const loadMessages = useCallback(
    async (targetFolder: MailFolderKey, targetFilter: MailReadFilter, mode: 'switch' | 'quiet' | 'refresh') => {
      const id = ++listRequestId.current;
      if (mode === 'refresh') {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
        if (mode === 'switch') {
          setMessages([]);
          setNextLink(undefined);
        }
      }
      setListError('');

      try {
        const result = await listMessages(targetFolder, { filter: targetFilter });
        if (id !== listRequestId.current) return;
        setMessages(result.messages);
        setNextLink(result.nextLink);
      } catch (err) {
        if (id !== listRequestId.current) return;
        if (isReauth(err)) {
          router.replace('/mail/connect');
          return;
        }
        setMessages([]);
        setListError(err instanceof Error ? err.message : TEXT.MAIL_UNABLE_TO_LOAD);
      } finally {
        if (id === listRequestId.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [],
  );

  const refreshUnread = useCallback(() => {
    // The count is a nicety — a failure leaves the last one showing.
    getInboxUnreadCount().then(setInboxUnread).catch(() => undefined);
  }, []);

  /**
   * The module switch first, connected or not: switching the module off has
   * to reach someone who is already connected too — their tokens are fine,
   * it is the module that is closed. The same call tells us whether compose
   * is on, which decides both the compose button and the scopes any token
   * refresh from here on asks for.
   */
  const runCheck = useCallback(
    async (isCancelled: () => boolean = () => false) => {
      try {
        const status = await checkMailModule();
        if (isCancelled()) return;
        setComposeEnabled(status.compose);
      } catch (err) {
        if (isCancelled()) return;
        setIsReady(false);
        setModuleError(err instanceof Error ? err.message : TEXT.MAIL_UNABLE_TO_LOAD);
        return;
      }

      const connected = await mailAuthService.isConnected();
      if (isCancelled()) return;
      if (!connected) {
        router.replace('/mail/connect');
        return;
      }

      setModuleError('');
      setIsReady(true);
      mailAuthService.getAccount().then((account) => {
        if (!isCancelled()) setAccountEmail(account?.mail || account?.displayName || '');
      });
      loadMessages(folderRef.current, filterRef.current, 'quiet');
      refreshUnread();
    },
    [loadMessages, refreshUnread],
  );

  // On every focus, not just on mount: coming back from a message has to show
  // it as read, and a later disconnect (sign-out) has to land back on connect.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      runCheck(() => cancelled);
      return () => {
        cancelled = true;
      };
    }, [runCheck]),
  );

  // --- search --------------------------------------------------------------------
  // Its own result set, searched by Graph within the current folder — see
  // services/mailService.ts's searchMessages for why not a JS filter.
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
      searchMessages(folder, trimmed)
        .then((result) => {
          if (id === searchRequestId.current) setSearchResults(result.messages);
        })
        .catch((err: unknown) => {
          if (id !== searchRequestId.current) return;
          if (isReauth(err)) {
            router.replace('/mail/connect');
            return;
          }
          setSearchResults([]);
        })
        .finally(() => {
          if (id === searchRequestId.current) setIsSearching(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [searchText, folder]);

  // Graph can't apply the read filter to a $search, so it is applied here —
  // harmless, a search answers with at most 25 rows anyway.
  const displayed = isSearchMode ? applyReadFilter(searchResults ?? [], filter) : messages;

  // --- actions -------------------------------------------------------------------
  const selectFolder = useCallback(
    (next: MailFolderKey) => {
      if (next === folderRef.current) return;
      folderRef.current = next;
      setFolder(next);
      loadMessages(next, filterRef.current, 'switch');
    },
    [loadMessages],
  );

  const selectFilter = useCallback(
    (next: MailReadFilter) => {
      setFilterSheetVisible(false);
      if (next === filterRef.current) return;
      filterRef.current = next;
      setFilter(next);
      loadMessages(folderRef.current, next, 'switch');
    },
    [loadMessages],
  );

  const handleLoadMore = useCallback(async () => {
    if (!nextLink || isLoadingMore) return;
    const id = listRequestId.current;
    setIsLoadingMore(true);
    try {
      const result = await listMessages(folderRef.current, { filter: filterRef.current, nextLink });
      if (id !== listRequestId.current) return;
      setMessages((prev) => [...prev, ...result.messages]);
      setNextLink(result.nextLink);
    } catch (err) {
      // Pagination failures don't need to interrupt an already-populated
      // list — pull-to-refresh is the retry. A reauth failure is the one
      // exception: nothing further down the list will load either.
      if (isReauth(err)) router.replace('/mail/connect');
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextLink, isLoadingMore]);

  const openMessage = useCallback(
    (message: MailMessage) => {
      // A draft is carried on writing, not read — when writing is available.
      if (message.isDraft && composeEnabled) {
        router.push({ pathname: '/mail/compose', params: { mode: 'draft', id: message.id } });
        return;
      }

      // detail.tsx marks it read in Outlook (compose scopes only); mirror that
      // here so the dot is gone the moment you come back, not after the reload.
      if (!message.isRead && composeEnabled) {
        const markRead = (list: MailMessage[]) =>
          list.map((m) => (m.id === message.id ? { ...m, isRead: true } : m));
        setMessages(markRead);
        setSearchResults((prev) => (prev ? markRead(prev) : prev));
        if (folderRef.current === 'inbox') setInboxUnread((count) => Math.max(0, count - 1));
      }
      router.push({ pathname: '/mail/detail', params: { id: message.id } });
    },
    [composeEnabled],
  );

  const openCompose = useCallback(() => {
    router.push({ pathname: '/mail/compose', params: { mode: 'new' } });
  }, []);

  const renderEmpty = () => {
    if (isSearchMode) {
      return isSearching ? null : (
        <EmptyState
          preset="search"
          message={`${TEXT.MAIL_SEARCH_NO_RESULT} “${searchText.trim()}”`}
          description={TEXT.MAIL_SEARCH_NO_RESULT_HINT}
        />
      );
    }
    if (filter !== 'all') return <EmptyState preset="list" message={TEXT.MAIL_FILTER_EMPTY} />;
    if (folder === 'inbox') return <EmptyState preset="cleared" message={TEXT.MAIL_INBOX_EMPTY} />;
    return <EmptyState preset="list" message={TEXT.MAIL_FOLDER_EMPTY} />;
  };

  const renderList = () => {
    if (listError && !isSearchMode) {
      return (
        <ErrorState
          title={TEXT.SHARED_SOMETHING_WENT_WRONG}
          message={listError}
          onRetry={() => loadMessages(folder, filter, 'switch')}
        />
      );
    }
    if (isLoading && displayed.length === 0 && !isSearchMode) {
      return <LoadingAnimate title={TEXT.MAIL_LOADING} desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT} />;
    }
    return (
      <FlatList
        style={styles.flatList}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: MAIL_BOTTOM_BAR_SPACE + insets.bottom + 12 },
        ]}
        data={displayed}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MailCard
            message={item}
            showsRecipients={folderInfo.showsRecipients}
            onPress={() => openMessage(item)}
          />
        )}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          isSearchMode ? undefined : (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                loadMessages(folder, filter, 'refresh');
                refreshUnread();
              }}
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
        ListEmptyComponent={renderEmpty()}
      />
    );
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="light" />
      <NavTopBar
        title={accountEmail || TEXT.MAIL_HEADER_TITLE}
        titleStyle={accountEmail ? styles.accountTitle : undefined}
        backHref="/"
        showHomeButton={false}
        tone="primary"
      />

      {!isReady ? (
        <View style={styles.content}>
          {moduleError ? (
            <ErrorState
              title={TEXT.SHARED_SOMETHING_WENT_WRONG}
              message={moduleError}
              onRetry={() => runCheck()}
            />
          ) : (
            <LoadingAnimate title={TEXT.MAIL_LOADING} desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT} />
          )}
        </View>
      ) : (
        <>
          <View style={styles.content}>
            <View style={styles.header}>
              <MailMockBanner />
              <MailFolderChips selected={folder} onSelect={selectFolder} inboxUnread={inboxUnread} />
              {filter !== 'all' ? (
                <View style={styles.filterLine}>
                  <ThemedText style={styles.filterText}>
                    {TEXT.MAIL_FILTER_ACTIVE_PREFIX} {MAIL_READ_FILTER_LABEL[filter]}
                  </ThemedText>
                  <Pressable accessibilityRole="button" hitSlop={8} onPress={() => selectFilter('all')}>
                    <ThemedText style={styles.filterClear}>{TEXT.MAIL_FILTER_CLEAR}</ThemedText>
                  </Pressable>
                </View>
              ) : null}
            </View>
            {renderList()}
          </View>

          <MailBottomBar
            searchText={searchText}
            onChangeSearch={setSearchText}
            searchPlaceholder={`${TEXT.MAIL_SEARCH_IN_PREFIX} ${folderInfo.label}`}
            isSearching={isSearching}
            isFilterActive={filter !== 'all'}
            onPressFilter={() => setFilterSheetVisible(true)}
            onPressCompose={composeEnabled ? openCompose : undefined}
          />

          <MailFilterSheet
            visible={isFilterSheetVisible}
            value={filter}
            onSelect={selectFilter}
            onClose={() => setFilterSheetVisible(false)}
          />
        </>
      )}
    </ThemedView>
  );
}

const staticStyles = StyleSheet.create({
  unreadDot: { width: 7, height: 7, borderRadius: 3.5 },
});

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  // An address is longer than any screen title; a size down keeps most of it
  // on one line before the ellipsis.
  accountTitle: { fontSize: 16.5, lineHeight: 22 },
  content: { flex: 1, paddingHorizontal: 16 },
  header: { gap: 10, paddingTop: 12, paddingBottom: 10 },
  filterLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterText: {
    fontFamily: AppFonts.psuBold,
    fontSize: 13,
    color: c.primary,
  },
  filterClear: {
    fontFamily: AppFonts.psuRegular,
    fontSize: 13,
    color: c.textMuted,
    textDecorationLine: 'underline',
  },
  flatList: { flex: 1 },
  listContent: { flexGrow: 1, paddingTop: 2 },
  footer: { paddingVertical: 20, alignItems: 'center' },
});

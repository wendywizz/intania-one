import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { InfinityLoader } from '@/components/infinity-loader';
import { LoadingAnimate } from '@/components/loading-animate';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ListCard } from '@/components/ui/list-card';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import * as mailAuthService from '@/services/mailAuthService';
import { assertMailModuleEnabled, listInboxMessages, type MailMessage } from '@/services/mailService';
import { formatNewsDateTime } from '@/utils/date-format';

function MailCard({ message }: { message: MailMessage }) {
  const c = useColors();
  const isRead = message.isRead;
  const senderName = message.from.name || message.from.address || TEXT.MAIL_UNKNOWN_SENDER;

  return (
    <ListCard
      onPress={() => router.push({ pathname: '/mail/detail', params: { id: message.id } })}
      icon={<IconSymbol name="envelope.fill" size={18} color={isRead ? c.textFaint : c.primary} />}
      iconBackground={isRead ? c.surfaceMuted : c.primarySoft}
      title={message.subject || TEXT.MAIL_NO_SUBJECT}
      titleNumberOfLines={1}
      date={message.receivedDateTime ? formatNewsDateTime(message.receivedDateTime) : undefined}
      meta={[{ text: senderName }, { text: message.bodyPreview }]}
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
          <FlatList
            style={styles.flatList}
            contentContainerStyle={styles.listContent}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <MailCard message={item} />}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => loadMessages(true)}
                tintColor={c.primary}
                colors={[c.primary]}
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              isLoadingMore ? (
                <View style={styles.footer}>
                  <InfinityLoader size={44} strokeWidth={4} />
                </View>
              ) : null
            }
            ListEmptyComponent={<EmptyState preset="cleared" message={TEXT.MAIL_INBOX_EMPTY} />}
          />
        )}
      </View>
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  flatList: { flex: 1 },
  listContent: { flexGrow: 1, paddingTop: 4, paddingBottom: 24 },
  footer: { paddingVertical: 20, alignItems: 'center' },
});

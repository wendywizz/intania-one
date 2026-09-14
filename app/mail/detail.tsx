import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import WebView from 'react-native-webview';

import { LoadingAnimate } from '@/components/loading-animate';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { type AppColors, useThemedStyles } from '@/constants/theme';
import { isMailReauthRequiredText } from '@/services/mailAuthService';
import { getMessage, type MailMessage } from '@/services/mailService';
import { formatNewsDateTime } from '@/utils/date-format';

export default function MailDetailScreen() {
  const styles = useThemedStyles(makeStyles);
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id ?? '';

  const [message, setMessage] = useState<MailMessage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    if (!id) {
      setError(TEXT.MAIL_UNABLE_TO_LOAD);
      setIsLoading(false);
      return undefined;
    }

    setIsLoading(true);
    setError('');
    getMessage(id)
      .then((data) => {
        if (!cancelled) setMessage(data);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof Error && isMailReauthRequiredText(err.message)) {
          router.replace('/mail/connect');
          return;
        }
        setError(err instanceof Error ? err.message : TEXT.MAIL_UNABLE_TO_LOAD);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <StatusBar style="light" />
        <NavTopBar title={TEXT.MAIL_DETAIL_HEADER_TITLE} showBackButton onBackPress={() => router.back()} tone="primary" />
        <LoadingAnimate title={TEXT.MAIL_LOADING} desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT} />
      </ThemedView>
    );
  }

  if (error || !message) {
    return (
      <ThemedView style={styles.container}>
        <StatusBar style="light" />
        <NavTopBar title={TEXT.MAIL_DETAIL_HEADER_TITLE} showBackButton onBackPress={() => router.back()} tone="primary" />
        <View style={styles.centerWrap}>
          <View style={styles.errorCard}>
            <ThemedText style={styles.errorTitle}>{TEXT.SHARED_SOMETHING_WENT_WRONG}</ThemedText>
            <ThemedText style={styles.errorMessage}>{error || TEXT.MAIL_UNABLE_TO_LOAD}</ThemedText>
            <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.retryButton}>
              <ThemedText style={styles.retryText}>{TEXT.SHARED_GO_BACK}</ThemedText>
            </Pressable>
          </View>
        </View>
      </ThemedView>
    );
  }

  const senderName = message.from.name || message.from.address || TEXT.MAIL_UNKNOWN_SENDER;
  const isHtmlBody = message.body?.contentType === 'html';

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="light" />
      <NavTopBar title={TEXT.MAIL_DETAIL_HEADER_TITLE} showBackButton onBackPress={() => router.back()} tone="primary" />

      <View style={styles.header}>
        <ThemedText style={styles.subject} numberOfLines={3}>
          {message.subject || TEXT.MAIL_NO_SUBJECT}
        </ThemedText>
        <View style={styles.senderRow}>
          <ThemedText style={styles.senderName} numberOfLines={1}>
            {senderName}
          </ThemedText>
          {message.from.address ? (
            <ThemedText style={styles.senderAddress} numberOfLines={1}>
              {message.from.address}
            </ThemedText>
          ) : null}
        </View>
        {message.receivedDateTime ? (
          <ThemedText style={styles.date}>{formatNewsDateTime(message.receivedDateTime)}</ThemedText>
        ) : null}
      </View>

      {message.body?.content ? (
        isHtmlBody ? (
          <WebView
            source={{ html: message.body.content }}
            style={styles.webview}
            javaScriptEnabled={false}
            sharedCookiesEnabled={false}
            thirdPartyCookiesEnabled={false}
            // v1 offers no "open in browser" — a tapped link or remote image
            // inside the body does nothing rather than navigating somewhere
            // this screen has no chrome to get back from. The initial
            // `source={{html}}` load itself resolves as "about:blank"; only
            // that one is let through.
            onShouldStartLoadWithRequest={(request) => request.url === 'about:blank'}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.textBodyContent}>
            <ThemedText style={styles.textBody}>{message.body.content}</ThemedText>
          </ScrollView>
        )
      ) : (
        <ScrollView contentContainerStyle={styles.textBodyContent}>
          <ThemedText style={styles.textBody}>{message.bodyPreview}</ThemedText>
        </ScrollView>
      )}
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    gap: 4,
  },
  subject: {
    fontFamily: AppFonts.psuBold,
    fontSize: 17,
    lineHeight: 24,
    color: c.text,
  },
  senderRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' },
  senderName: {
    fontFamily: AppFonts.psuBold,
    fontSize: 14,
    color: c.text,
  },
  senderAddress: {
    fontFamily: AppFonts.psuRegular,
    fontSize: 13,
    color: c.textMuted,
  },
  date: {
    fontFamily: AppFonts.psuRegular,
    fontSize: 12.5,
    color: c.textFaint,
    marginTop: 2,
  },
  webview: { flex: 1 },
  textBodyContent: { padding: 16 },
  textBody: {
    fontFamily: AppFonts.psuRegular,
    fontSize: 14,
    lineHeight: 21,
    color: c.text,
  },
  centerWrap: { flex: 1, padding: 16, justifyContent: 'center' },
  errorCard: {
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(223, 191, 189, 0.3)',
    padding: 20,
    gap: 8,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04)',
  },
  errorTitle: { fontFamily: AppFonts.psuBold, fontSize: 15, color: c.primary },
  errorMessage: {
    fontFamily: AppFonts.psuRegular,
    fontSize: 14,
    lineHeight: 20,
    color: c.textMuted,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: c.pomegranate,
  },
  retryText: { color: c.textOnPrimary, fontFamily: AppFonts.psuBold, fontSize: 14 },
});

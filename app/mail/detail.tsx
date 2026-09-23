import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import WebView from 'react-native-webview';

import { LoadingAnimate } from '@/components/loading-animate';
import { SenderAvatar } from '@/components/mail/sender-avatar';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { isMailReauthRequiredText } from '@/services/mailAuthService';
import { getMessage, type MailMessage } from '@/services/mailService';
import { formatNewsDateTime } from '@/utils/date-format';

/**
 * Threads the app's own theme colours into whatever HTML Graph handed back,
 * without running a single line of the message's own script — the `<style>`
 * block below is plain CSS, so `javaScriptEnabled={false}` on the WebView
 * stays exactly as strict as it was.
 *
 * Deliberately *defaults*, not `!important` overrides: an email that sets its
 * own explicit colours (a designed newsletter, an official letter meant to
 * look a particular way on paper) keeps looking the way its author intended —
 * this only fills in for the common case of a plain message with no styling
 * of its own, so it doesn't flash white-on-white in dark mode. The one
 * genuine `!important` is images/tables never exceeding the screen width:
 * there is no reading in which a fixed-pixel Outlook table should be allowed
 * to force the whole message into horizontal scrolling on a phone.
 *
 * The viewport meta tag is the other half of "looks like a webview" — most
 * exported mail HTML has none, so a WKWebView renders it at desktop width and
 * the phone shows a zoomed-out postage stamp of text. Injected here rather
 * than assumed present, and only when the document doesn't already carry one
 * of its own.
 */
function withThemedStyle(html: string, c: AppColors): string {
  const styleBlock = `<style>
    html, body { margin: 0; }
    body {
      padding: 16px;
      font-size: 15px;
      line-height: 1.65;
      background: ${c.background};
      color: ${c.text};
    }
    img, table { max-width: 100% !important; height: auto !important; }
    td, th { word-break: break-word; }
  </style>`;
  const viewportTag = /<meta[^>]+name=["']viewport["']/i.test(html)
    ? ''
    : '<meta name="viewport" content="width=device-width, initial-scale=1">';
  const head = `${viewportTag}${styleBlock}`;

  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (match) => `${match}${head}`);
  }
  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/<html[^>]*>/i, (match) => `${match}<head>${head}</head>`);
  }
  return `<!DOCTYPE html><html><head>${head}</head><body>${html}</body></html>`;
}

export default function MailDetailScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id ?? '';

  const [message, setMessage] = useState<MailMessage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Computed unconditionally (Rules of Hooks) even though it is only used
  // past the loading/error returns below — recomputed only when the message
  // or the theme actually changes, not on every render of a body that can run
  // to tens of KB of HTML.
  const styledHtml = useMemo(() => {
    if (!message?.body?.content || message.body.contentType !== 'html') return '';
    return withThemedStyle(message.body.content, c);
  }, [message, c]);

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
        <ThemedText style={styles.subject} numberOfLines={4}>
          {message.subject || TEXT.MAIL_NO_SUBJECT}
        </ThemedText>
        <View style={styles.senderRow}>
          <SenderAvatar name={message.from.name} address={message.from.address} size={36} />
          <View style={styles.senderTextCol}>
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
      </View>

      {message.body?.content ? (
        isHtmlBody ? (
          <WebView
            source={{ html: styledHtml }}
            style={styles.webview}
            javaScriptEnabled={false}
            sharedCookiesEnabled={false}
            thirdPartyCookiesEnabled={false}
            // Android-only: without it a WebView with no viewport meta shrinks
            // to fit desktop width, which is exactly the "tiny zoomed-out
            // text" look this screen is trying to get away from. The `<meta
            // viewport>` withThemedStyle() injects is what actually fixes it
            // on iOS; this is the Android half of the same fix.
            scalesPageToFit={false}
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
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    gap: 12,
  },
  subject: {
    fontFamily: AppFonts.psuBold,
    fontSize: 19,
    lineHeight: 26,
    color: c.text,
  },
  senderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  senderTextCol: { flex: 1, gap: 1 },
  senderName: {
    fontFamily: AppFonts.psuBold,
    fontSize: 14.5,
    color: c.text,
  },
  senderAddress: {
    fontFamily: AppFonts.psuRegular,
    fontSize: 12.5,
    color: c.textMuted,
  },
  date: {
    fontFamily: AppFonts.psuRegular,
    fontSize: 12,
    color: c.textFaint,
    flexShrink: 0,
    alignSelf: 'flex-start',
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

import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import WebView from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoadingAnimate } from '@/components/loading-animate';
import { SenderAvatar } from '@/components/mail/sender-avatar';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { isMailComposeEnabled, isMailReauthRequiredText } from '@/services/mailAuthService';
import {
  getMessage,
  markMessageRead,
  type ComposeMode,
  type MailMessage,
  type MailRecipient,
} from '@/services/mailService';
import { formatNewsDateTime } from '@/utils/date-format';

const RESPONSE_ACTIONS: { mode: ComposeMode; label: string; icon: IconSymbolName }[] = [
  { mode: 'reply', label: TEXT.MAIL_REPLY, icon: 'arrowshape.turn.up.left' },
  { mode: 'replyAll', label: TEXT.MAIL_REPLY_ALL, icon: 'arrowshape.turn.up.left.2' },
  { mode: 'forward', label: TEXT.MAIL_FORWARD, icon: 'arrowshape.turn.up.right' },
];

function recipientNames(list: MailRecipient[]) {
  return list.map((recipient) => recipient.name || recipient.address).filter(Boolean).join(', ');
}

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
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id ?? '';
  // Read once: the list screen has already asked scooba on its way here.
  const composeEnabled = isMailComposeEnabled();

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
        if (cancelled) return;
        setMessage(data);
        // Opening it reads it, in Outlook too. Needs Mail.ReadWrite, so only
        // while compose is on; fire-and-forget — a failure here leaves the
        // message unread, which is not worth interrupting reading it for.
        if (!data.isRead && composeEnabled) {
          markMessageRead(data.id).catch(() => undefined);
        }
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
  }, [id, composeEnabled]);

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
        {message.toRecipients.length > 0 || message.ccRecipients.length > 0 ? (
          <View style={styles.recipients}>
            {message.toRecipients.length > 0 ? (
              <ThemedText style={styles.recipientLine} numberOfLines={2}>
                <ThemedText style={styles.recipientLabel}>{TEXT.MAIL_TO_PREFIX} </ThemedText>
                {recipientNames(message.toRecipients)}
              </ThemedText>
            ) : null}
            {message.ccRecipients.length > 0 ? (
              <ThemedText style={styles.recipientLine} numberOfLines={2}>
                <ThemedText style={styles.recipientLabel}>{TEXT.MAIL_CC_PREFIX} </ThemedText>
                {recipientNames(message.ccRecipients)}
              </ThemedText>
            ) : null}
          </View>
        ) : null}
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

      {/* iOS Mail keeps these in a bar under the message, where the thumb is.
          Not on a draft: that is carried on writing from the Drafts list. */}
      {composeEnabled && !message.isDraft ? (
        <View style={[styles.actionBar, { paddingBottom: insets.bottom + 8 }]}>
          {RESPONSE_ACTIONS.map((action) => (
            <Pressable
              key={action.mode}
              accessibilityRole="button"
              onPress={() =>
                router.push({ pathname: '/mail/compose', params: { mode: action.mode, id: message.id } })
              }
              style={({ pressed }) => [styles.action, pressed ? styles.actionPressed : null]}
            >
              <IconSymbol name={action.icon} size={21} color={c.primary} />
              <ThemedText style={styles.actionLabel}>{action.label}</ThemedText>
            </Pressable>
          ))}
        </View>
      ) : null}
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
  recipients: { gap: 2 },
  recipientLine: {
    fontFamily: AppFonts.psuRegular,
    fontSize: 12.5,
    lineHeight: 18,
    color: c.textMuted,
  },
  recipientLabel: {
    fontFamily: AppFonts.psuBold,
    fontSize: 12.5,
    color: c.textMuted,
  },
  actionBar: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingHorizontal: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    backgroundColor: c.surface,
  },
  action: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 6,
    borderRadius: 10,
  },
  actionPressed: { backgroundColor: c.surfaceAlt },
  actionLabel: {
    fontFamily: AppFonts.psuBold,
    fontSize: 12,
    color: c.primary,
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

import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AttachmentViewer } from '@/components/mail/attachment-viewer';
import { MailBody } from '@/components/mail/mail-body';
import { LoadingAnimate } from '@/components/loading-animate';
import { SenderAvatar } from '@/components/mail/sender-avatar';
import { NavTopBar } from '@/components/nav-top-bar';
import { SectionCard } from '@/components/section-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useToast } from '@/components/toast-provider';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { AppFonts } from '@/constants/fonts';
import { boxShadow } from '@/constants/shadows';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { isMailComposeEnabled, isMailReauthRequiredText } from '@/services/mailAuthService';
import {
  deleteMessage,
  getMessage,
  listAttachments,
  type MailAttachment,
  markMessageRead,
  type ComposeMode,
  type MailMessage,
  type MailRecipient,
} from '@/services/mailService';
import { formatNewsDateTime } from '@/utils/date-format';

// Reply and reply-all share one toolbar button that opens a small menu, the
// way iOS Mail does; forward and delete are single taps.
const REPLY_MENU: { mode: ComposeMode; label: string; icon: IconSymbolName }[] = [
  { mode: 'reply', label: TEXT.MAIL_REPLY, icon: 'arrowshape.turn.up.left' },
  { mode: 'replyAll', label: TEXT.MAIL_REPLY_ALL, icon: 'arrowshape.turn.up.left.2' },
];

const TOOLBAR_HEIGHT = 56;
const TOOLBAR_GAP = 10;

function recipientNames(list: MailRecipient[]) {
  return list.map((recipient) => recipient.name || recipient.address).filter(Boolean).join(', ');
}

export default function MailDetailScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; folder?: string }>();
  const id = params.id ?? '';
  // Read once: the list screen has already asked scooba on its way here.
  const composeEnabled = isMailComposeEnabled();
  const { showToast } = useToast();
  // Deleting from Deleted Items is permanent, so only that asks first. The list
  // passes the folder along; with none, assume the safe (recoverable) case.
  const isInDeletedItems = params.folder === 'deleteditems';
  const [isConfirmVisible, setConfirmVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReplyMenuVisible, setReplyMenuVisible] = useState(false);

  const handleDelete = useCallback(async () => {
    setConfirmVisible(false);
    setIsDeleting(true);
    try {
      await deleteMessage(id);
      showToast(TEXT.MAIL_DELETED, 'success');
      // The list reloads on focus, so it drops the row by itself.
      router.back();
    } catch (err) {
      if (err instanceof Error && isMailReauthRequiredText(err.message)) {
        router.replace('/mail/connect');
        return;
      }
      showToast(TEXT.MAIL_DELETE_FAILED, 'error');
      setIsDeleting(false);
    }
  }, [id, showToast]);

  const [message, setMessage] = useState<MailMessage | null>(null);
  const [attachments, setAttachments] = useState<MailAttachment[]>([]);
  const [openAttachment, setOpenAttachment] = useState<MailAttachment | null>(null);
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
    // Best effort: a failure here just means no attachment list.
    listAttachments(id)
      .then((list) => {
        if (!cancelled) setAttachments(list);
      })
      .catch(() => undefined);
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
  const bodyContent = message.body?.content;

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="light" />
      <NavTopBar
        title={TEXT.MAIL_DETAIL_HEADER_TITLE}
        showBackButton
        onBackPress={() => router.back()}
        tone="primary"
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          composeEnabled ? { paddingBottom: TOOLBAR_HEIGHT + TOOLBAR_GAP * 2 + insets.bottom + 16 } : null,
        ]}
      >
        <SectionCard>
          <ThemedText style={styles.subject}>{message.subject || TEXT.MAIL_NO_SUBJECT}</ThemedText>
          <View style={styles.divider} />
          <View style={styles.senderRow}>
            <SenderAvatar name={message.from.name} address={message.from.address} size={44} />
            <View style={styles.senderTextCol}>
              <View style={styles.senderTopRow}>
                <ThemedText style={styles.senderName} numberOfLines={1}>
                  {senderName}
                </ThemedText>
                {message.receivedDateTime ? (
                  <ThemedText style={styles.date}>{formatNewsDateTime(message.receivedDateTime)}</ThemedText>
                ) : null}
              </View>
              {message.from.address ? (
                <ThemedText style={styles.senderAddress} numberOfLines={1}>
                  {message.from.address}
                </ThemedText>
              ) : null}
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
          </View>
        </SectionCard>
        <SectionCard>
          {bodyContent ? (
            isHtmlBody ? <MailBody html={bodyContent} /> : <MailBody text={bodyContent} />
          ) : (
            <MailBody text={message.bodyPreview} />
          )}
        </SectionCard>
        {attachments.length > 0 ? (
          <SectionCard title={`${TEXT.MAIL_ATTACHMENTS} (${attachments.length})`} style={styles.attachments}>
            {attachments.map((file) => (
              <Pressable
                key={file.id}
                accessibilityRole="button"
                onPress={() => setOpenAttachment(file)}
                style={({ pressed }) => [styles.attachmentRow, pressed ? styles.actionPressed : null]}
              >
                <IconSymbol name="doc.text.fill" size={22} color={c.primary} />
                <View style={styles.senderTextCol}>
                  <ThemedText style={styles.attachmentName} numberOfLines={1}>
                    {file.name}
                  </ThemedText>
                  {file.size > 0 ? (
                    <ThemedText style={styles.attachmentSize}>
                      {file.size >= 1048576 ? (file.size / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(file.size / 1024)) + ' KB'}
                    </ThemedText>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </SectionCard>
        ) : null}
      </ScrollView>

      {/* iOS Mail's floating toolbar: reply (a menu), forward in the middle,
          delete. A draft has nothing to reply to — it is carried on writing
          from the Drafts list — so only delete is left on it. */}
      {composeEnabled ? (
        <>
          {isReplyMenuVisible ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={TEXT.CANCEL}
                onPress={() => setReplyMenuVisible(false)}
                style={StyleSheet.absoluteFill}
              />
              <View style={[styles.menu, { bottom: insets.bottom + TOOLBAR_GAP * 2 + TOOLBAR_HEIGHT }]}>
                {REPLY_MENU.map((item, index) => (
                  <Pressable
                    key={item.mode}
                    accessibilityRole="button"
                    onPress={() => {
                      setReplyMenuVisible(false);
                      router.push({ pathname: '/mail/compose', params: { mode: item.mode, id: message.id } });
                    }}
                    style={({ pressed }) => [
                      styles.menuItem,
                      index > 0 ? styles.menuItemDivider : null,
                      pressed ? styles.actionPressed : null,
                    ]}
                  >
                    <IconSymbol name={item.icon} size={20} color={c.text} />
                    <ThemedText style={styles.menuLabel}>{item.label}</ThemedText>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          <View pointerEvents="box-none" style={[styles.toolbarWrap, { bottom: insets.bottom + TOOLBAR_GAP }]}>
            <View style={[styles.toolbar, message.isDraft ? styles.toolbarSingle : null]}>
              {!message.isDraft ? (
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={TEXT.MAIL_REPLY_MENU_LABEL}
                    accessibilityState={{ expanded: isReplyMenuVisible }}
                    onPress={() => setReplyMenuVisible((open) => !open)}
                    style={({ pressed }) => [styles.toolbarButton, pressed ? styles.toolbarPressed : null]}
                  >
                    <IconSymbol name="arrowshape.turn.up.left" size={24} color={c.text} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={TEXT.MAIL_FORWARD_LABEL}
                    onPress={() => {
                      setReplyMenuVisible(false);
                      router.push({ pathname: '/mail/compose', params: { mode: 'forward', id: message.id } });
                    }}
                    style={({ pressed }) => [styles.toolbarButton, pressed ? styles.toolbarPressed : null]}
                  >
                    <IconSymbol name="arrowshape.turn.up.right" size={24} color={c.text} />
                  </Pressable>
                </>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={TEXT.MAIL_DELETE}
                disabled={isDeleting}
                onPress={() => {
                  setReplyMenuVisible(false);
                  setConfirmVisible(true);
                }}
                style={({ pressed }) => [
                  styles.toolbarButton,
                  pressed || isDeleting ? styles.toolbarPressed : null,
                ]}
              >
                <IconSymbol name="trash.fill" size={24} color={c.danger} />
              </Pressable>
            </View>
          </View>
        </>
      ) : null}

      {openAttachment ? (
        <AttachmentViewer messageId={message.id} attachment={openAttachment} onClose={() => setOpenAttachment(null)} />
      ) : null}

      <ConfirmDialog
        visible={isConfirmVisible}
        title={isInDeletedItems ? TEXT.MAIL_DELETE_FOREVER_TITLE : TEXT.MAIL_DELETE_CONFIRM_TITLE}
        message={isInDeletedItems ? TEXT.MAIL_DELETE_FOREVER_MESSAGE : TEXT.MAIL_DELETE_CONFIRM_MESSAGE}
        confirmLabel={TEXT.MAIL_DELETE}
        icon="trash.fill"
        destructive
        onCancel={() => setConfirmVisible(false)}
        onConfirm={handleDelete}
      />
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, gap: 12 },
  subject: {
    fontFamily: AppFonts.psuBold,
    fontSize: 21,
    lineHeight: 28,
    color: c.text,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: c.border },
  senderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  senderTextCol: { flex: 1, gap: 1 },
  senderTopRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  senderName: { flexShrink: 1, fontFamily: AppFonts.psuBold, fontSize: 15, lineHeight: 22, color: c.text },
  senderAddress: { fontFamily: AppFonts.psuRegular, fontSize: 13, lineHeight: 19, color: c.textMuted },
  date: { fontFamily: AppFonts.psuRegular, fontSize: 12, lineHeight: 18, color: c.textFaint, flexShrink: 0 },
  recipients: { gap: 2, marginTop: 6 },
  recipientLine: { fontFamily: AppFonts.psuRegular, fontSize: 13, lineHeight: 19, color: c.textMuted },
  recipientLabel: { fontFamily: AppFonts.psuBold, fontSize: 13, color: c.textFaint },
  toolbarWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: TOOLBAR_HEIGHT,
    borderRadius: TOOLBAR_HEIGHT / 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.surface,
    boxShadow: boxShadow(c.shadow, { y: 4, blur: 16, opacity: 0.12 }),
  },
  toolbarSingle: { width: 96 },
  // Equal thirds put forward in the exact middle, reply and delete at the ends.
  toolbarButton: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center' },
  toolbarPressed: { opacity: 0.55 },
  menu: {
    position: 'absolute',
    left: 16,
    minWidth: 220,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.surface,
    overflow: 'hidden',
    boxShadow: boxShadow(c.shadow, { y: 6, blur: 20, opacity: 0.18 }),
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 50, paddingHorizontal: 16 },
  menuItemDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  menuLabel: { fontFamily: AppFonts.psuRegular, fontSize: 16, color: c.text },
  attachments: { gap: 8 },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: c.surfaceAlt,
  },
  attachmentName: { fontFamily: AppFonts.psuBold, fontSize: 14, lineHeight: 20, color: c.text },
  attachmentSize: { fontFamily: AppFonts.psuRegular, fontSize: 12, lineHeight: 18, color: c.textMuted },
  actionPressed: { backgroundColor: c.surfaceAlt },
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

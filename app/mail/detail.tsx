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
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useToast } from '@/components/toast-provider';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { AppFonts } from '@/constants/fonts';
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

const RESPONSE_ACTIONS: { mode: ComposeMode; label: string; icon: IconSymbolName }[] = [
  { mode: 'reply', label: TEXT.MAIL_REPLY, icon: 'arrowshape.turn.up.left' },
  { mode: 'replyAll', label: TEXT.MAIL_REPLY_ALL, icon: 'arrowshape.turn.up.left.2' },
  { mode: 'forward', label: TEXT.MAIL_FORWARD, icon: 'arrowshape.turn.up.right' },
];

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
        rightContent={
          composeEnabled ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={TEXT.MAIL_DELETE}
              disabled={isDeleting}
              hitSlop={8}
              onPress={() => (isInDeletedItems ? setConfirmVisible(true) : handleDelete())}
              style={({ pressed }) => [styles.trashButton, pressed || isDeleting ? styles.actionPressed : null]}
            >
              <IconSymbol name="trash.fill" size={21} color={c.textOnPrimary} />
            </Pressable>
          ) : undefined
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <ThemedText style={styles.subject}>{message.subject || TEXT.MAIL_NO_SUBJECT}</ThemedText>
        </View>
        <View style={styles.senderCard}>
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
        <View style={styles.bodyWrap}>
          {bodyContent ? (
            isHtmlBody ? <MailBody html={bodyContent} /> : <MailBody text={bodyContent} />
          ) : (
            <MailBody text={message.bodyPreview} />
          )}
        </View>
        {attachments.length > 0 ? (
          <View style={styles.attachments}>
            <ThemedText style={styles.attachmentsTitle}>
              {TEXT.MAIL_ATTACHMENTS} ({attachments.length})
            </ThemedText>
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
          </View>
        ) : null}
      </ScrollView>

      {/* iOS Mail keeps these in a bar under the message, where the thumb is.
          Not on a draft: that is carried on writing from the Drafts list. */}
      {composeEnabled && !message.isDraft ? (
        <View style={[styles.actionBar, { paddingBottom: insets.bottom + 10 }]}>
          {RESPONSE_ACTIONS.map((action, index) => (
            <Pressable
              key={action.mode}
              accessibilityRole="button"
              onPress={() =>
                router.push({ pathname: '/mail/compose', params: { mode: action.mode, id: message.id } })
              }
              style={({ pressed }) => [
                styles.action,
                index === 0 ? styles.actionPrimary : null,
                pressed ? styles.actionBtnPressed : null,
              ]}
            >
              <IconSymbol name={action.icon} size={18} color={index === 0 ? c.textOnPrimary : c.primary} />
              <ThemedText style={[styles.actionLabel, index === 0 ? styles.actionLabelPrimary : null]} numberOfLines={1}>
                {action.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      ) : null}

      {openAttachment ? (
        <AttachmentViewer messageId={message.id} attachment={openAttachment} onClose={() => setOpenAttachment(null)} />
      ) : null}

      <ConfirmDialog
        visible={isConfirmVisible}
        title={TEXT.MAIL_DELETE_FOREVER_TITLE}
        message={TEXT.MAIL_DELETE_FOREVER_MESSAGE}
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
  scrollContent: { paddingBottom: 24 },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14 },
  subject: {
    fontFamily: AppFonts.psuBold,
    fontSize: 21,
    lineHeight: 28,
    color: c.text,
  },
  senderCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: c.border,
  },
  senderTextCol: { flex: 1, gap: 1 },
  senderTopRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  senderName: { flexShrink: 1, fontFamily: AppFonts.psuBold, fontSize: 15, lineHeight: 22, color: c.text },
  senderAddress: { fontFamily: AppFonts.psuRegular, fontSize: 13, lineHeight: 19, color: c.textMuted },
  date: { fontFamily: AppFonts.psuRegular, fontSize: 12, lineHeight: 18, color: c.textFaint, flexShrink: 0 },
  recipients: { gap: 2, marginTop: 6 },
  recipientLine: { fontFamily: AppFonts.psuRegular, fontSize: 13, lineHeight: 19, color: c.textMuted },
  recipientLabel: { fontFamily: AppFonts.psuBold, fontSize: 13, color: c.textFaint },
  bodyWrap: { paddingHorizontal: 20, paddingTop: 18 },
  actionBar: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 10,
    paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    backgroundColor: c.surface,
  },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: c.primary,
    backgroundColor: c.surface,
  },
  actionPrimary: { backgroundColor: c.primary },
  actionBtnPressed: { opacity: 0.7 },
  actionLabelPrimary: { color: c.textOnPrimary },
  attachments: { marginHorizontal: 20, marginTop: 8, gap: 8 },
  attachmentsTitle: { fontFamily: AppFonts.psuBold, fontSize: 14, lineHeight: 20, color: c.textMuted },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  attachmentName: { fontFamily: AppFonts.psuBold, fontSize: 14, lineHeight: 20, color: c.text },
  attachmentSize: { fontFamily: AppFonts.psuRegular, fontSize: 12, lineHeight: 18, color: c.textMuted },
  actionPressed: { backgroundColor: c.surfaceAlt },
  trashButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  actionLabel: {
    fontFamily: AppFonts.psuBold,
    fontSize: 14,
    color: c.primary,
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

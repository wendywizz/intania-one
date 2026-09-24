import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ErrorState } from '@/components/error-state';
import { LoadingAnimate } from '@/components/loading-animate';
import { RecipientField } from '@/components/mail/recipient-field';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useToast } from '@/components/toast-provider';
import { Button } from '@/components/ui/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Sheet } from '@/components/ui/sheet';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { getAccount, isMailComposeEnabled, isMailReauthRequiredText } from '@/services/mailAuthService';
import {
  bodyAsPlainText,
  deleteDraft,
  getMessage,
  saveDraft,
  sendMessage,
  type ComposeMode,
  type ComposePayload,
  type MailMessage,
  type MailRecipient,
} from '@/services/mailService';
import { formatNewsDateTime } from '@/utils/date-format';

const TITLE: Record<ComposeMode, string> = {
  new: TEXT.MAIL_COMPOSE_TITLE_NEW,
  reply: TEXT.MAIL_COMPOSE_TITLE_REPLY,
  replyAll: TEXT.MAIL_COMPOSE_TITLE_REPLY,
  forward: TEXT.MAIL_COMPOSE_TITLE_FORWARD,
  draft: TEXT.MAIL_COMPOSE_TITLE_DRAFT,
};

function toComposeMode(value?: string): ComposeMode {
  return value === 'reply' || value === 'replyAll' || value === 'forward' || value === 'draft' ? value : 'new';
}

/** Outlook's prefixes. A subject that already has the same one keeps it,
 * so a long thread doesn't read "RE: RE: RE:". */
function withPrefix(mode: 'reply' | 'replyAll' | 'forward', subject: string) {
  const trimmed = subject.trim();
  if (mode === 'forward') return /^(fw|fwd)\s*:/i.test(trimmed) ? trimmed : `FW: ${trimmed}`;
  return /^re\s*:/i.test(trimmed) ? trimmed : `RE: ${trimmed}`;
}

/** Drops blanks, duplicates and anything in `exclude` (yourself, on reply-all). */
function uniqueRecipients(list: MailRecipient[], exclude: string[]): MailRecipient[] {
  const seen = new Set(exclude.map((address) => address.toLowerCase()).filter(Boolean));
  return list.filter((recipient) => {
    const key = recipient.address.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isReauth(error: unknown) {
  return error instanceof Error && isMailReauthRequiredText(error.message);
}

/**
 * Writing mail: new, reply, reply-all, forward, or carrying on a draft
 * (`mode` route param; `id` is the message replied to or the draft).
 *
 * Only reachable while the 'scooba-psu-mail-compose' switch is on — the list
 * and detail screens don't offer the way in otherwise — but it checks again
 * itself, since a stale link or a switch flipped mid-session can still land
 * here.
 *
 * Leaving with anything typed asks first — save as a draft, throw it away,
 * or keep writing — whichever way you leave: the back button, the iOS
 * swipe, or Android's back key all go through the same `beforeRemove` guard.
 */
export default function MailComposeScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const navigation = useNavigation();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ mode?: string; id?: string }>();
  const mode = toComposeMode(params.mode);
  const id = params.id ?? '';
  const composeEnabled = isMailComposeEnabled();

  const [to, setTo] = useState<MailRecipient[]>([]);
  const [cc, setCc] = useState<MailRecipient[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [original, setOriginal] = useState<MailMessage | null>(null);
  const [draftId, setDraftId] = useState<string | undefined>(mode === 'draft' && id ? id : undefined);
  const [isHtmlDraft, setIsHtmlDraft] = useState(false);
  const [bodyEdited, setBodyEdited] = useState(false);
  const [isPrefilling, setIsPrefilling] = useState(mode !== 'new' && Boolean(id));
  const [prefillError, setPrefillError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isClosePromptVisible, setClosePromptVisible] = useState(false);

  // Refs, not state: the beforeRemove listener reads them at the moment of
  // leaving, and a state value captured when the listener was attached would
  // always be the stale "nothing typed yet".
  const hasUnsavedRef = useRef(false);
  const pendingLeaveRef = useRef<unknown>(null);
  const markEdited = useCallback(() => {
    hasUnsavedRef.current = true;
  }, []);

  // --- prefill -------------------------------------------------------------------
  useEffect(() => {
    if (mode === 'new' || !id) return undefined;
    let cancelled = false;

    Promise.all([getMessage(id), getAccount()])
      .then(([message, account]) => {
        if (cancelled) return;
        const me = account?.mail ?? '';

        if (mode === 'draft') {
          setTo(uniqueRecipients(message.toRecipients, []));
          setCc(uniqueRecipients(message.ccRecipients, []));
          setSubject(message.subject);
          setBody(bodyAsPlainText(message));
          setIsHtmlDraft(message.body?.contentType === 'html');
          return;
        }

        setOriginal(message);
        setSubject(withPrefix(mode, message.subject));
        if (mode === 'reply') {
          setTo(uniqueRecipients([message.from], [me]));
        } else if (mode === 'replyAll') {
          const nextTo = uniqueRecipients([message.from, ...message.toRecipients], [me]);
          setTo(nextTo);
          setCc(uniqueRecipients(message.ccRecipients, [me, ...nextTo.map((r) => r.address)]));
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (isReauth(err)) {
          router.replace('/mail/connect');
          return;
        }
        setPrefillError(err instanceof Error ? err.message : TEXT.MAIL_UNABLE_TO_LOAD);
      })
      .finally(() => {
        if (!cancelled) setIsPrefilling(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mode, id]);

  // --- leaving -------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (!hasUnsavedRef.current) return;
      event.preventDefault();
      pendingLeaveRef.current = event.data.action;
      setClosePromptVisible(true);
    });
    return unsubscribe;
  }, [navigation]);

  /** Leaves for real — past the guard, the way the person was trying to go. */
  const leave = useCallback(() => {
    hasUnsavedRef.current = false;
    setClosePromptVisible(false);
    const action = pendingLeaveRef.current;
    pendingLeaveRef.current = null;
    if (action) {
      navigation.dispatch(action as Parameters<typeof navigation.dispatch>[0]);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/mail');
    }
  }, [navigation]);

  const keepEditing = useCallback(() => {
    pendingLeaveRef.current = null;
    setClosePromptVisible(false);
  }, []);

  const buildPayload = (): ComposePayload => ({
    mode,
    sourceId: original?.id,
    draftId,
    to,
    cc,
    subject: subject.trim(),
    body,
    keepBody: isHtmlDraft && !bodyEdited,
  });

  // --- actions -------------------------------------------------------------------
  const handleSend = async () => {
    if (isSending || isPrefilling) return;
    if (to.length === 0 && cc.length === 0) {
      showToast(TEXT.MAIL_COMPOSE_NEED_RECIPIENT, 'error');
      return;
    }

    setIsSending(true);
    try {
      await sendMessage(buildPayload());
      showToast(TEXT.MAIL_COMPOSE_SENT, 'success');
      pendingLeaveRef.current = null;
      leave();
    } catch (err) {
      if (isReauth(err)) {
        hasUnsavedRef.current = false;
        router.replace('/mail/connect');
        return;
      }
      const detail = err instanceof Error && err.message ? `: ${err.message}` : '';
      showToast(`${TEXT.MAIL_COMPOSE_SEND_FAILED}${detail}`, 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      const savedId = await saveDraft(buildPayload());
      setDraftId(savedId);
      showToast(TEXT.MAIL_COMPOSE_DRAFT_SAVED, 'success');
      leave();
    } catch (err) {
      const detail = err instanceof Error && err.message ? `: ${err.message}` : '';
      showToast(`${TEXT.MAIL_COMPOSE_DRAFT_SAVE_FAILED}${detail}`, 'error');
      keepEditing();
    } finally {
      setIsSavingDraft(false);
    }
  };

  // A new message is simply dropped; an existing draft is deleted, as iOS
  // Mail's "Delete Draft" does.
  const handleDiscard = async () => {
    if (draftId) {
      try {
        await deleteDraft(draftId);
        showToast(TEXT.MAIL_COMPOSE_DRAFT_DELETED, 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : TEXT.SHARED_SOMETHING_WENT_WRONG, 'error');
        keepEditing();
        return;
      }
    }
    leave();
  };

  // --- render --------------------------------------------------------------------
  const header = (
    <NavTopBar
      title={TITLE[mode]}
      showHomeButton={false}
      tone="primary"
      rightContent={
        composeEnabled && !prefillError ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={TEXT.MAIL_COMPOSE_SEND}
            disabled={isSending || isPrefilling}
            onPress={handleSend}
            style={({ pressed }) => [
              styles.sendButton,
              pressed ? styles.pressed : null,
              isSending || isPrefilling ? styles.disabled : null,
            ]}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={c.textOnPrimary} />
            ) : (
              <IconSymbol name="paperplane.fill" size={16} color={c.textOnPrimary} />
            )}
            <ThemedText lightColor={c.textOnPrimary} darkColor={c.textOnPrimary} style={styles.sendText}>
              {TEXT.MAIL_COMPOSE_SEND}
            </ThemedText>
          </Pressable>
        ) : undefined
      }
    />
  );

  if (!composeEnabled || prefillError) {
    return (
      <ThemedView style={styles.container}>
        <StatusBar style="light" />
        {header}
        <ErrorState
          title={TEXT.SHARED_SOMETHING_WENT_WRONG}
          message={prefillError || TEXT.MAIL_COMPOSE_UNAVAILABLE}
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="light" />
      {header}

      {isPrefilling ? (
        <LoadingAnimate title={TEXT.MAIL_LOADING} desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT} />
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <RecipientField label={TEXT.MAIL_COMPOSE_TO} recipients={to} onChange={setTo} onEdited={markEdited} />
            <View style={styles.divider} />
            <RecipientField label={TEXT.MAIL_COMPOSE_CC} recipients={cc} onChange={setCc} onEdited={markEdited} />
            <View style={styles.divider} />

            <View style={styles.subjectLine}>
              <ThemedText style={styles.fieldLabel}>{TEXT.MAIL_COMPOSE_SUBJECT}:</ThemedText>
              <TextInput
                value={subject}
                onChangeText={(value) => {
                  setSubject(value);
                  markEdited();
                }}
                placeholderTextColor={c.textFaint}
                style={[styles.subjectInput, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
              />
            </View>
            <View style={styles.divider} />

            {isHtmlDraft ? (
              <View style={styles.note}>
                <IconSymbol name="info.circle.fill" size={16} color={c.infoOnSoft} />
                <ThemedText style={styles.noteText}>{TEXT.MAIL_COMPOSE_HTML_DRAFT_NOTE}</ThemedText>
              </View>
            ) : null}

            <TextInput
              multiline
              value={body}
              onChangeText={(value) => {
                setBody(value);
                setBodyEdited(true);
                markEdited();
              }}
              placeholder={TEXT.MAIL_COMPOSE_BODY_PLACEHOLDER}
              placeholderTextColor={c.textFaint}
              textAlignVertical="top"
              style={[styles.bodyInput, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
            />

            {original ? (
              <View style={styles.original}>
                <ThemedText style={styles.originalLabel}>{TEXT.MAIL_COMPOSE_ORIGINAL_MESSAGE}</ThemedText>
                <ThemedText style={styles.originalMeta} numberOfLines={1}>
                  {original.from.name || original.from.address}
                  {original.receivedDateTime ? ` · ${formatNewsDateTime(original.receivedDateTime)}` : ''}
                </ThemedText>
                <ThemedText style={styles.originalPreview} numberOfLines={6}>
                  {original.bodyPreview}
                </ThemedText>
              </View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      <Sheet
        visible={isClosePromptVisible}
        onClose={keepEditing}
        title={TEXT.MAIL_COMPOSE_CLOSE_TITLE}
        animation="pop"
        scroll={false}
      >
        <View style={styles.promptActions}>
          <Button
            title={TEXT.MAIL_COMPOSE_SAVE_DRAFT}
            icon="doc.pencil"
            onPress={handleSaveDraft}
            loading={isSavingDraft}
            fullWidth
          />
          <Button
            title={draftId ? TEXT.MAIL_COMPOSE_DELETE_DRAFT : TEXT.MAIL_COMPOSE_DISCARD}
            icon="trash.fill"
            variant="danger"
            onPress={handleDiscard}
            disabled={isSavingDraft}
            fullWidth
          />
          <Button
            title={TEXT.MAIL_COMPOSE_KEEP_EDITING}
            variant="secondary"
            onPress={keepEditing}
            disabled={isSavingDraft}
            fullWidth
          />
        </View>
      </Sheet>
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1 },
  form: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: c.border },
  subjectLine: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  fieldLabel: {
    fontFamily: AppFonts.psuRegular,
    fontSize: 15,
    color: c.textMuted,
  },
  subjectInput: {
    flex: 1,
    height: 30,
    paddingVertical: 0,
    color: c.text,
    fontFamily: AppFonts.psuBold,
    fontSize: 15,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: c.infoSoft,
  },
  noteText: {
    flex: 1,
    fontFamily: AppFonts.psuRegular,
    fontSize: 12.5,
    lineHeight: 18,
    color: c.infoOnSoft,
  },
  bodyInput: {
    minHeight: 220,
    paddingTop: 14,
    paddingBottom: 14,
    color: c.text,
    fontFamily: AppFonts.psuRegular,
    fontSize: 15,
    lineHeight: 23,
  },
  original: {
    marginTop: 8,
    padding: 12,
    gap: 4,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: c.borderStrong,
    backgroundColor: c.surfaceAlt,
  },
  originalLabel: { fontFamily: AppFonts.psuBold, fontSize: 12.5, color: c.textMuted },
  originalMeta: { fontFamily: AppFonts.psuBold, fontSize: 13, color: c.text },
  originalPreview: { fontFamily: AppFonts.psuRegular, fontSize: 13, lineHeight: 19, color: c.textMuted },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: c.textOnPrimary,
  },
  sendText: { fontFamily: AppFonts.psuBold, fontSize: 14 },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.5 },
  promptActions: { gap: 10, paddingBottom: 6 },
});

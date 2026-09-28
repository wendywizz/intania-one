import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { formatCompOtShift } from '@/components/comp-ot/comp-ot-format';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadingAnimate } from '@/components/loading-animate';
import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/toast-provider';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { UserAvatar } from '@/components/user-avatar';
import { AppFonts } from '@/constants/fonts';
import { boxShadow } from '@/constants/shadows';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import {
  cancelCompOtSwap,
  respondCompOtSwap,
  type CompOtSwapRequest,
} from '@/services/compOtService';

type SwapAction = 'accept' | 'decline' | 'cancel';

/** The wording of the confirmation for each thing the person can do to a request. */
function confirmCopy(request: CompOtSwapRequest, action: SwapAction) {
  if (action === 'accept') {
    return {
      title: TEXT.COMP_OT_SWAP_ACCEPT_TITLE,
      message: request.type === 'ex' ? TEXT.COMP_OT_SWAP_ACCEPT_EX_MESSAGE : TEXT.COMP_OT_SWAP_ACCEPT_SELL_MESSAGE,
      confirmLabel: TEXT.COMP_OT_SWAP_ACCEPT,
      destructive: false,
    };
  }
  if (action === 'decline') {
    return {
      title: TEXT.COMP_OT_SWAP_DECLINE_TITLE,
      message: TEXT.COMP_OT_SWAP_DECLINE_MESSAGE,
      confirmLabel: TEXT.COMP_OT_SWAP_DECLINE,
      destructive: true,
    };
  }
  return {
    title: TEXT.COMP_OT_SWAP_CANCEL_TITLE,
    message: TEXT.COMP_OT_SWAP_CANCEL_MESSAGE,
    confirmLabel: TEXT.COMP_OT_SWAP_CANCEL,
    destructive: true,
  };
}

function SwapRequestCard({
  request,
  onAction,
}: {
  request: CompOtSwapRequest;
  onAction: (request: CompOtSwapRequest, action: SwapAction) => void;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const incoming = request.direction === 'incoming';
  // The other party is who the card is about: who is asking, or who was asked.
  const other = incoming ? request.from : request.to;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <UserAvatar staffId={other.staff_id} size={40} />
        <View style={styles.headerText}>
          <ThemedText style={styles.name} numberOfLines={1}>
            {other.staff_name || TEXT.COMP_OT_UNKNOWN_STAFF}
          </ThemedText>
          <ThemedText style={styles.kind}>
            {request.type === 'ex' ? TEXT.COMP_OT_SWAP_BUTTON : TEXT.COMP_OT_SELL_BUTTON}
          </ThemedText>
        </View>
      </View>

      <View style={styles.detail}>
        <ThemedText style={styles.detailLabel}>{TEXT.COMP_OT_SWAP_THEIR_SHIFT}</ThemedText>
        <ThemedText style={styles.detailValue}>
          {request.source_event ? formatCompOtShift(request.source_event) : TEXT.COMP_OT_SWAP_SHIFT_GONE}
        </ThemedText>
      </View>

      {request.type === 'ex' ? (
        <View style={styles.detail}>
          <ThemedText style={styles.detailLabel}>{TEXT.COMP_OT_SWAP_YOUR_SHIFT}</ThemedText>
          <ThemedText style={styles.detailValue}>
            {request.target_event ? formatCompOtShift(request.target_event) : TEXT.COMP_OT_SWAP_SHIFT_GONE}
          </ThemedText>
        </View>
      ) : null}

      {request.invalid_reason ? (
        <View style={[styles.reason, { backgroundColor: c.dangerSoft }]}>
          <ThemedText style={[styles.reasonText, { color: c.dangerOnSoft }]}>{request.invalid_reason}</ThemedText>
        </View>
      ) : null}

      <View style={styles.actions}>
        {incoming ? (
          <>
            <Button
              title={TEXT.COMP_OT_SWAP_DECLINE}
              variant="secondary"
              onPress={() => onAction(request, 'decline')}
              style={styles.action}
            />
            <Button
              title={TEXT.COMP_OT_SWAP_ACCEPT}
              variant="primary"
              disabled={!!request.invalid_reason}
              onPress={() => onAction(request, 'accept')}
              style={styles.action}
            />
          </>
        ) : (
          <Button
            title={TEXT.COMP_OT_SWAP_CANCEL}
            variant="dangerOutline"
            onPress={() => onAction(request, 'cancel')}
            style={styles.action}
          />
        )}
      </View>
    </View>
  );
}

type CompOtSwapsTabProps = {
  staffId: string;
  /** Owned by the screen, which also needs them for the pending badges on the roster. */
  requests: CompOtSwapRequest[];
  isLoading: boolean;
  error: string;
  onReload: () => Promise<void>;
  /** After accepting, declining or cancelling - the roster may have changed owner too. */
  onChanged: () => void;
};

/**
 * The exchange/sale requests the caller sent or was sent, with answering them.
 * The second tab of the roster screen: a request that was accepted moves a
 * shift, so the screen reloads the roster as well once one is answered.
 */
export function CompOtSwapsTab({ staffId, requests, isLoading, error, onReload, onChanged }: CompOtSwapsTabProps) {
  const styles = useThemedStyles(makeStyles);
  const { showToast } = useToast();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pending, setPending] = useState<{ request: CompOtSwapRequest; action: SwapAction } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const incoming = useMemo(() => requests.filter((r) => r.direction === 'incoming'), [requests]);
  const outgoing = useMemo(() => requests.filter((r) => r.direction === 'outgoing'), [requests]);

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      await onReload();
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleConfirm() {
    if (!pending || !staffId) return;
    const { request, action } = pending;
    setIsSubmitting(true);
    try {
      if (action === 'cancel') {
        await cancelCompOtSwap({ staffId, requestId: request.request_id });
        showToast(TEXT.COMP_OT_SWAP_CANCELLED_TOAST, 'success');
      } else {
        await respondCompOtSwap({ staffId, requestId: request.request_id, action });
        showToast(
          action === 'accept' ? TEXT.COMP_OT_SWAP_ACCEPTED_TOAST : TEXT.COMP_OT_SWAP_DECLINED_TOAST,
          'success',
        );
      }
    } catch (err) {
      // The server may have dropped the request (a shift moved on) - reload
      // either way so the list stops showing something that can no longer be answered.
      showToast(err instanceof Error ? err.message : TEXT.COMP_OT_SWAP_ACTION_ERROR, 'error');
    } finally {
      setPending(null);
      setIsSubmitting(false);
      onChanged();
    }
  }

  const copy = pending ? confirmCopy(pending.request, pending.action) : null;
  const select = (request: CompOtSwapRequest, action: SwapAction) => setPending({ request, action });

  return (
    <View style={styles.root}>
      {isLoading && requests.length === 0 ? (
        <LoadingAnimate title={TEXT.SHARED_LOADING_DATA_TITLE} desc={TEXT.SHARED_LOADING_DESCRIPTION} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => onReload()} />
      ) : requests.length === 0 ? (
        <EmptyState preset="schedule" message={TEXT.COMP_OT_SWAPS_EMPTY} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}>
          {incoming.length > 0 ? (
            <>
              <ThemedText style={styles.sectionTitle}>{`${TEXT.COMP_OT_SWAPS_INCOMING} (${incoming.length})`}</ThemedText>
              {incoming.map((r) => (
                <SwapRequestCard key={r.request_id} request={r} onAction={select} />
              ))}
            </>
          ) : null}

          {outgoing.length > 0 ? (
            <>
              <ThemedText style={styles.sectionTitle}>{`${TEXT.COMP_OT_SWAPS_OUTGOING} (${outgoing.length})`}</ThemedText>
              {outgoing.map((r) => (
                <SwapRequestCard key={r.request_id} request={r} onAction={select} />
              ))}
            </>
          ) : null}
        </ScrollView>
      )}

      <ConfirmDialog
        visible={!!pending}
        title={copy?.title ?? ''}
        message={copy?.message}
        confirmLabel={copy?.confirmLabel}
        cancelLabel={TEXT.COMP_OT_SWAP_BACK}
        destructive={copy?.destructive}
        loading={isSubmitting}
        onConfirm={handleConfirm}
        onCancel={() => setPending(null)}
      />
    </View>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  root: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 32 },
  sectionTitle: {
    fontFamily: AppFonts.psuBold,
    fontSize: 14,
    lineHeight: 20,
    color: c.textMuted,
    marginTop: 4,
    marginBottom: 8,
  },

  card: {
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    marginBottom: 12,
    gap: 8,
    boxShadow: boxShadow(c.shadow, { y: 2, blur: 8, opacity: 0.04 }),
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  headerText: { flex: 1 },
  name: { fontFamily: AppFonts.psuBold, fontSize: 15, lineHeight: 21, color: c.text },
  kind: { fontFamily: AppFonts.psuRegular, fontSize: 13, lineHeight: 18, color: c.primary },

  detail: { gap: 1 },
  detailLabel: { fontFamily: AppFonts.psuRegular, fontSize: 12, lineHeight: 17, color: c.textFaint },
  detailValue: { fontFamily: AppFonts.psuBold, fontSize: 14, lineHeight: 20, color: c.text },

  reason: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  reasonText: { fontFamily: AppFonts.psuRegular, fontSize: 13, lineHeight: 18 },

  actions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  action: { flex: 1 },
});

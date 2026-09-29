import { useEffect, useMemo, useRef, useState } from 'react';

import { compOtShiftTypeLabel, formatCompOtShift } from '@/components/comp-ot/comp-ot-format';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SelectSheet, type SelectSheetOption } from '@/components/ui/select-sheet';
import { UserAvatar } from '@/components/user-avatar';
import { TEXT } from '@/constants/text';
import { POP_OUT_MS } from '@/hooks/use-pop-animation';
import type { CompOtEvent, CompOtSwapCandidates } from '@/services/compOtService';

/** Slack on top of the sheet's own exit, for a slow frame. */
const AFTER_SHEET_CLOSED_MS = POP_OUT_MS + 80;

/** A shift the person has chosen to offer, with who/what it can be offered to. */
export type CompOtSwapOffer = {
  event: CompOtEvent;
  candidates: CompOtSwapCandidates;
};

export type CompOtSwapTarget = { targetEventId?: string; targetStaffId?: string };

type CompOtSwapOfferSheetProps = {
  offer: CompOtSwapOffer | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (target: CompOtSwapTarget) => void;
};

/**
 * Pick who to offer a shift to, then confirm. For an exchange the choices are
 * other people's later shifts; for a sale, colleagues on the same roster - the
 * same two lists the legacy web pages offered (frm_exchange.php / frm_sell.php).
 *
 * The candidates arrive already loaded: fetching them is the caller's job, so
 * the sheet never opens onto a spinner.
 */
export function CompOtSwapOfferSheet({ offer, submitting, onClose, onSubmit }: CompOtSwapOfferSheetProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pickedId, setPickedId] = useState<string | null>(null);
  // SelectSheet calls onSelect and then onClose in the same tap, so the close
  // handler cannot tell "picked something" from "dismissed" by reading state -
  // the pick is not in state yet. The ref is.
  const pickedRef = useRef<string | null>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A fresh choice every time a different shift is offered.
  useEffect(() => {
    pickedRef.current = null;
    setPickedId(null);
    setSheetOpen(!!offer);
    return () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
    };
  }, [offer]);

  function handleSheetClose() {
    setSheetOpen(false);
    const id = pickedRef.current;
    if (!id) {
      onClose();
      return;
    }
    // Open the confirmation only once the sheet's own Modal is gone. On iOS a
    // Modal that finishes dismissing while another is presented above it takes
    // that one down with it, so opening both at once shows no dialog at all.
    confirmTimer.current = setTimeout(() => setPickedId(id), AFTER_SHEET_CLOSED_MS);
  }

  const options = useMemo<SelectSheetOption[]>(() => {
    if (!offer) return [];
    if (offer.candidates.type === 'ex') {
      return offer.candidates.events.map((e) => ({
        id: e.event_id,
        label: e.staff_name || TEXT.COMP_OT_UNKNOWN_STAFF,
        description: formatCompOtShift(e),
        meta: compOtShiftTypeLabel(e.shift_type),
        leading: <UserAvatar staffId={e.staff_id} size={36} />,
      }));
    }
    return offer.candidates.staff.map((s) => ({
      id: String(s.staff_id),
      label: s.staff_name || TEXT.COMP_OT_UNKNOWN_STAFF,
      leading: <UserAvatar staffId={s.staff_id} size={36} />,
    }));
  }, [offer]);

  if (!offer) return null;

  const isExchange = offer.candidates.type === 'ex';
  const picked = pickedId ? options.find((o) => o.id === pickedId) ?? null : null;
  const pickedEvent =
    picked && offer.candidates.type === 'ex'
      ? offer.candidates.events.find((e) => e.event_id === picked.id) ?? null
      : null;

  const confirmMessage = picked
    ? (isExchange ? TEXT.COMP_OT_SWAP_CONFIRM_MESSAGE : TEXT.COMP_OT_SELL_CONFIRM_MESSAGE)
        .replace('{mine}', formatCompOtShift(offer.event))
        .replace('{theirs}', pickedEvent ? formatCompOtShift(pickedEvent) : '')
        .replace('{name}', picked.label)
    : '';

  function handleConfirm() {
    if (!picked) return;
    onSubmit(isExchange ? { targetEventId: picked.id } : { targetStaffId: picked.id });
  }

  return (
    <>
      {/* One Modal at a time - the sheet closes before the dialog opens (see
          handleSheetClose), never the two stacked. */}
      <SelectSheet
        visible={sheetOpen}
        onClose={handleSheetClose}
        title={isExchange ? TEXT.COMP_OT_SWAP_PICK_SHIFT_TITLE : TEXT.COMP_OT_SWAP_PICK_STAFF_TITLE}
        options={options}
        onSelect={(option) => {
          pickedRef.current = option.id;
        }}
        emptyMessage={isExchange ? TEXT.COMP_OT_SWAP_NO_SHIFT_CANDIDATES : TEXT.COMP_OT_SWAP_NO_STAFF_CANDIDATES}
      />

      {/* Cancelling ends the offer rather than going back to the list: going
          back would reopen the sheet while this dialog is still closing - the
          same iOS problem in reverse. Choosing again is one tap on the card. */}
      <ConfirmDialog
        visible={!!picked}
        title={isExchange ? TEXT.COMP_OT_SWAP_CONFIRM_TITLE : TEXT.COMP_OT_SELL_CONFIRM_TITLE}
        message={confirmMessage}
        confirmLabel={TEXT.COMP_OT_SWAP_CONFIRM_SEND}
        cancelLabel={TEXT.COMP_OT_SWAP_CONFIRM_CANCEL}
        loading={submitting}
        onConfirm={handleConfirm}
        onCancel={onClose}
      />
    </>
  );
}

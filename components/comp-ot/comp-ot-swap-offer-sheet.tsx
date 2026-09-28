import { useEffect, useMemo, useState } from 'react';

import { compOtShiftTypeLabel, formatCompOtShift } from '@/components/comp-ot/comp-ot-format';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SelectSheet, type SelectSheetOption } from '@/components/ui/select-sheet';
import { UserAvatar } from '@/components/user-avatar';
import { TEXT } from '@/constants/text';
import type { CompOtEvent, CompOtSwapCandidates } from '@/services/compOtService';

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
  const [pickedId, setPickedId] = useState<string | null>(null);

  // A fresh choice every time a different shift is offered.
  useEffect(() => {
    setPickedId(null);
  }, [offer]);

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
      {/* Hidden while the confirmation is up rather than kept behind it - two
          stacked modals is where iOS starts dropping the top one. */}
      <SelectSheet
        visible={!picked}
        onClose={onClose}
        title={isExchange ? TEXT.COMP_OT_SWAP_PICK_SHIFT_TITLE : TEXT.COMP_OT_SWAP_PICK_STAFF_TITLE}
        options={options}
        onSelect={(option) => setPickedId(option.id)}
        emptyMessage={isExchange ? TEXT.COMP_OT_SWAP_NO_SHIFT_CANDIDATES : TEXT.COMP_OT_SWAP_NO_STAFF_CANDIDATES}
      />

      <ConfirmDialog
        visible={!!picked}
        title={isExchange ? TEXT.COMP_OT_SWAP_CONFIRM_TITLE : TEXT.COMP_OT_SELL_CONFIRM_TITLE}
        message={confirmMessage}
        confirmLabel={TEXT.COMP_OT_SWAP_CONFIRM_SEND}
        cancelLabel={TEXT.COMP_OT_SWAP_BACK}
        loading={submitting}
        onConfirm={handleConfirm}
        onCancel={() => setPickedId(null)}
      />
    </>
  );
}

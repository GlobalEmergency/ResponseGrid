'use client';

import { useActionState, useMemo, useState } from 'react';
import type { ReceptionActionState } from '../actions';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Textarea } from '@/components/atoms/textarea';
import { ErrorMessage } from '@/components/atoms/error-message';
import { FormField } from '@/components/molecules/form-field';
import type { Messages } from '@/i18n/messages/es';

const INITIAL: ReceptionActionState = { status: 'idle' };

type BoundAction = (
  prev: ReceptionActionState,
  formData: FormData,
) => Promise<ReceptionActionState>;

/** A declared line the operator verifies against what physically arrived. */
export interface DeclaredLine {
  id: string;
  name: string;
  quantity: number;
  unit: string | null;
  category: string;
  supplyId: string | null;
  presentation: string | null;
  expiresAt: string | null;
}

interface RowState {
  line: DeclaredLine;
  /** Received quantity as typed (kept as string for a controlled input). */
  qty: string;
  /** Unchecked = the line did not arrive and is dropped from what's received. */
  included: boolean;
}

interface ReceptionActionsProps {
  /** `submitReception` bound to (slug, intakeId). */
  action: BoundAction;
  lines: DeclaredLine[];
  t: Messages['recepcion'];
}

/**
 * Desk actions on a pending intake: verify the received lines (adjust
 * quantities, drop what didn't arrive) with a mandatory reason when they differ
 * from the declared ones (#129), plus notes and the three transition buttons
 * (receive / incomplete / reject) whose `intent` the single server action reads.
 *
 * ponytail: the editor adjusts quantities and drops lines — the desk's common
 * case. Adding an undeclared line isn't supported here; use reject/incomplete
 * for a wholesale mismatch. Add a line picker if the desk needs it.
 */
export function ReceptionActions({ action, lines, t }: ReceptionActionsProps) {
  const [state, formAction, pending] = useActionState<
    ReceptionActionState,
    FormData
  >(action, INITIAL);

  const [rows, setRows] = useState<RowState[]>(() =>
    lines.map((line) => ({ line, qty: String(line.quantity), included: true })),
  );
  const [reason, setReason] = useState('');

  const includedRows = rows.filter((r) => r.included);

  const changed = useMemo(
    () => rows.some((r) => !r.included || Number(r.qty) !== r.line.quantity),
    [rows],
  );

  const items = includedRows.map((r) => ({
    name: r.line.name,
    quantity: Number(r.qty),
    unit: r.line.unit,
    category: r.line.category,
    supplyId: r.line.supplyId,
    presentation: r.line.presentation,
    expiresAt: r.line.expiresAt,
  }));

  const setQty = (id: string, qty: string) =>
    setRows((prev) => prev.map((r) => (r.line.id === id ? { ...r, qty } : r)));
  const toggle = (id: string, included: boolean) =>
    setRows((prev) =>
      prev.map((r) => (r.line.id === id ? { ...r, included } : r)),
    );

  // Blocked when nothing arrived (use reject/incomplete), a quantity is invalid
  // (an included line must be a whole number ≥ 1 — for zero, untick "did not
  // arrive"), or an adjustment lacks its reason.
  const badQty = includedRows.some((r) => {
    const n = Number(r.qty);
    return r.qty.trim() === '' || !Number.isInteger(n) || n < 1;
  });
  const receiveBlocked =
    pending ||
    includedRows.length === 0 ||
    badQty ||
    (changed && reason.trim() === '');

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.status === 'error' && <ErrorMessage message={state.message} />}

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-display text-base font-bold text-navy">
            {t.verify_heading}
          </h2>
          <p className="text-sm text-muted">{t.verify_hint}</p>
        </div>

        <ul className="flex flex-col gap-2" role="list">
          {rows.map((r) => (
            <li
              key={r.line.id}
              className={`flex items-center gap-3 rounded-lg border-2 border-line bg-white px-4 py-3 ${
                r.included ? '' : 'opacity-60'
              }`}
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[15px] font-semibold text-ink">
                  {r.line.name}
                </span>
                <label className="mt-1 inline-flex items-center gap-1.5 text-[12.5px] text-muted">
                  <input
                    type="checkbox"
                    checked={!r.included}
                    onChange={(e) => toggle(r.line.id, !e.target.checked)}
                    className="h-3.5 w-3.5 accent-accent"
                  />
                  {t.line_excluded}
                </label>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  aria-label={t.qty_received_label}
                  value={r.qty}
                  disabled={!r.included}
                  onChange={(e) => setQty(r.line.id, e.target.value)}
                  className="w-20 py-2 text-right"
                />
                {r.line.unit != null && r.line.unit !== '' ? (
                  <span className="w-14 text-sm text-muted">{r.line.unit}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>

        {changed ? (
          <FormField htmlFor="adjustmentReason" label={t.reason_label}>
            <Textarea
              id="adjustmentReason"
              name="adjustmentReason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t.reason_placeholder}
            />
          </FormField>
        ) : null}
      </section>

      <input type="hidden" name="items" value={JSON.stringify(items)} />

      <FormField htmlFor="volunteerNotes" label={t.notes_label}>
        <Textarea
          id="volunteerNotes"
          name="volunteerNotes"
          rows={3}
          placeholder={t.notes_placeholder}
        />
      </FormField>

      <div className="flex flex-col gap-2.5">
        <Button
          type="submit"
          name="intent"
          value="receive"
          disabled={receiveBlocked}
          fullWidth
        >
          {pending ? t.receiving : t.receive_button}
        </Button>
        <Button
          type="submit"
          name="intent"
          value="incomplete"
          variant="secondary"
          disabled={pending}
          fullWidth
        >
          {pending ? t.marking_incomplete : t.incomplete_button}
        </Button>
        <Button
          type="submit"
          name="intent"
          value="reject"
          variant="danger-outline"
          disabled={pending}
          fullWidth
        >
          {pending ? t.rejecting : t.reject_button}
        </Button>
      </div>
    </form>
  );
}

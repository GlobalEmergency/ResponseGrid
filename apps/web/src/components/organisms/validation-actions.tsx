'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/atoms/button';
import { ErrorMessage } from '@/components/atoms/error-message';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';
import type { ActionResult } from '@/app/e/[slug]/coordinacion/actions';

/** A field a coordinator can edit while validating. */
export type EditField =
  | {
      key: string;
      label: string;
      kind: 'text' | 'textarea' | 'number';
      defaultValue?: string;
    }
  | {
      key: string;
      label: string;
      kind: 'select';
      options: { value: string; label: string }[];
      defaultValue?: string;
    };

interface ValidationActionsProps {
  /** Gates the whole block (validator/coordinator only). */
  canAct: boolean;
  /** Entity-specific editable fields rendered inside the edit form. */
  editFields: EditField[];
  /** Runs the edit server action with the mandatory reason and field values. */
  onEdit: (
    reason: string,
    values: Record<string, string>,
  ) => Promise<ActionResult>;
  /** Runs the discard server action with the mandatory reason. */
  onDiscard: (reason: string) => Promise<ActionResult>;
  /** Called after a successful edit/discard so the parent can close/refresh. */
  onActionSuccess: () => void;
}

const INPUT_CLASS =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-navy focus:outline-none';

/**
 * Reusable edit/discard block for the coordination detail drawers. Both actions
 * require a non-empty reason (≥3 chars) — the submit stays disabled until then —
 * giving every validation change real traceability in the audit log.
 */
export function ValidationActions({
  canAct,
  editFields,
  onEdit,
  onDiscard,
  onActionSuccess,
}: ValidationActionsProps) {
  const tc = getMessages(useLocale()).coord;
  const [mode, setMode] = useState<'none' | 'edit' | 'discard'>('none');
  const [reason, setReason] = useState('');
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(editFields.map((f) => [f.key, f.defaultValue ?? ''])),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!canAct) return null;

  const reasonValid = reason.trim().length >= 3;

  function reset(): void {
    setMode('none');
    setReason('');
    setError(null);
  }

  function run(action: () => Promise<ActionResult>): void {
    if (!reasonValid) {
      setError(tc.reason_required);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.status === 'success') {
        reset();
        onActionSuccess();
      } else if (result.status === 'error') {
        setError(result.message ?? tc.error_unknown);
      }
    });
  }

  const reasonField = (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-ink">
        {tc.reason_label} <span className="text-danger">*</span>
      </span>
      <textarea
        className={INPUT_CLASS}
        rows={2}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={tc.reason_placeholder}
        required
        aria-label={tc.reason_label}
      />
      <span className="text-xs text-muted">{tc.reason_help}</span>
    </label>
  );

  if (mode === 'discard') {
    return (
      <div className="flex flex-col gap-3">
        {error !== null && <ErrorMessage message={error} />}
        {reasonField}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={reset}
            disabled={pending}
          >
            {tc.drawer_close}
          </Button>
          <Button
            type="button"
            variant="danger-outline"
            fullWidth
            disabled={pending || !reasonValid}
            onClick={() => run(() => onDiscard(reason))}
          >
            {pending ? tc.discarding : tc.discard_confirm}
          </Button>
        </div>
      </div>
    );
  }

  if (mode === 'edit') {
    return (
      <div className="flex flex-col gap-3">
        {error !== null && <ErrorMessage message={error} />}
        {editFields.map((field) => (
          <label key={field.key} className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink">{field.label}</span>
            {field.kind === 'textarea' ? (
              <textarea
                className={INPUT_CLASS}
                rows={2}
                value={values[field.key] ?? ''}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [field.key]: e.target.value }))
                }
              />
            ) : field.kind === 'select' ? (
              <select
                className={INPUT_CLASS}
                value={values[field.key] ?? ''}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [field.key]: e.target.value }))
                }
              >
                {field.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={field.kind === 'number' ? 'number' : 'text'}
                className={INPUT_CLASS}
                value={values[field.key] ?? ''}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [field.key]: e.target.value }))
                }
              />
            )}
          </label>
        ))}
        <span className="text-xs text-muted">{tc.edit_keep_blank_hint}</span>
        {reasonField}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={reset}
            disabled={pending}
          >
            {tc.drawer_close}
          </Button>
          <Button
            type="button"
            fullWidth
            disabled={pending || !reasonValid}
            onClick={() => run(() => onEdit(reason, values))}
          >
            {pending ? tc.saving : tc.edit_save}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button type="button" variant="secondary" onClick={() => setMode('edit')}>
        {tc.action_edit}
      </Button>
      <Button type="button" variant="danger-outline" onClick={() => setMode('discard')}>
        {tc.action_discard}
      </Button>
    </div>
  );
}

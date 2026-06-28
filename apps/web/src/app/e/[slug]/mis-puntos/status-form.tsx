'use client';

import { useActionState } from 'react';
import { updateResourceStatus } from './actions';
import type { PublicStatus, ActionResult } from './actions';
import { StatusLight } from '@/components/atoms/status-light';
import { Select } from '@/components/atoms/select';
import { Button } from '@/components/atoms/button';
import { ErrorMessage } from '@/components/atoms/error-message';
import { FormField } from '@/components/molecules/form-field';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';

interface StatusFormProps {
  resourceId: string;
  currentStatus: PublicStatus;
  slug: string;
}

const INITIAL_STATE: ActionResult = { status: 'idle' };

export function StatusForm({ resourceId, currentStatus, slug }: StatusFormProps) {
  const ta = getMessages(useLocale()).account;

  const STATUS_OPTIONS: { value: PublicStatus; label: string }[] = [
    { value: 'active', label: ta.public_status_active },
    { value: 'saturated', label: ta.public_status_saturated },
    { value: 'paused', label: ta.public_status_paused },
    { value: 'closed', label: ta.public_status_closed },
  ];

  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    async (_prev, formData) => {
      const rawStatus = formData.get('status');
      if (typeof rawStatus !== 'string') {
        return { status: 'error', message: ta.status_invalid };
      }
      return updateResourceStatus(resourceId, rawStatus as PublicStatus, slug);
    },
    INITIAL_STATE,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted font-medium">{ta.current_label}</span>
        <StatusLight status={currentStatus} />
      </div>

      <FormField htmlFor={`status-${resourceId}`} label={ta.change_status_label}>
        <Select
          id={`status-${resourceId}`}
          name="status"
          defaultValue={currentStatus}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </FormField>

      {state.status === 'error' && (
        <ErrorMessage message={state.message ?? ta.error_unknown} />
      )}

      {state.status === 'success' && (
        <p className="text-xs text-success font-medium">{ta.status_updated_success}</p>
      )}

      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? ta.saving : ta.save_status_cta}
      </Button>
    </form>
  );
}

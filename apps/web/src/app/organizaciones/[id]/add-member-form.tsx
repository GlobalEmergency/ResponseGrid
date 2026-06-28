'use client';

import { useActionState } from 'react';
import { addMemberAction, type OrgActionResult } from '../actions';
import { Input } from '@/components/atoms/input';
import { Button } from '@/components/atoms/button';
import { ErrorMessage } from '@/components/atoms/error-message';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';

const INITIAL_STATE: OrgActionResult = { status: 'idle' };

interface AddMemberFormProps {
  orgId: string;
}

export function AddMemberForm({ orgId }: AddMemberFormProps) {
  const td = getMessages(useLocale()).org_detail;
  const boundAction = addMemberAction.bind(null, orgId);
  const [state, formAction, pending] = useActionState<OrgActionResult, FormData>(
    boundAction,
    INITIAL_STATE,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-lg border-2 border-line p-5">
      {state.status === 'error' && (
        <ErrorMessage message={state.message ?? td.add_error} />
      )}

      {/* Success */}
      {state.status === 'success' && (
        <p
          role="status"
          aria-live="polite"
          className="rounded-md border border-success bg-success-soft px-4 py-3 text-sm font-medium text-success"
        >
          {td.add_success}
        </p>
      )}

      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="add-member-email" className="sr-only">
            {td.add_email_label}
          </label>
          <Input
            id="add-member-email"
            name="email"
            type="email"
            required
            placeholder={td.add_email_ph}
          />
        </div>
        <Button type="submit" disabled={pending} size="md" className="shrink-0">
          {pending ? td.adding : td.add_submit}
        </Button>
      </div>
    </form>
  );
}

'use client';

import { useActionState } from 'react';
import type { ReceptionActionState } from '../actions';
import { Button } from '@/components/atoms/button';
import { Textarea } from '@/components/atoms/textarea';
import { ErrorMessage } from '@/components/atoms/error-message';
import { FormField } from '@/components/molecules/form-field';
import type { Messages } from '@/i18n/messages/es';

const INITIAL: ReceptionActionState = { status: 'idle' };

type BoundAction = (
  prev: ReceptionActionState,
  formData: FormData,
) => Promise<ReceptionActionState>;

interface ReceptionActionsProps {
  /** `submitReception` bound to (slug, intakeId). */
  action: BoundAction;
  t: Messages['recepcion'];
}

/**
 * Desk actions on a pending intake: one shared notes box and three submit
 * buttons whose `intent` (receive / incomplete / reject) the single server
 * action reads. Rendered only when the intake is pending and the operator
 * holds `intake:receive`.
 */
export function ReceptionActions({ action, t }: ReceptionActionsProps) {
  const [state, formAction, pending] = useActionState<
    ReceptionActionState,
    FormData
  >(action, INITIAL);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.status === 'error' && <ErrorMessage message={state.message} />}

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
          disabled={pending}
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

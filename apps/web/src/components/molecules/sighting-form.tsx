'use client';

import { useActionState } from 'react';
import type { AddSightingState } from '@/app/e/[slug]/coordinacion/reunificacion/actions';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Textarea } from '@/components/atoms/textarea';
import { ErrorMessage } from '@/components/atoms/error-message';
import { FormField } from '@/components/molecules/form-field';
import type { Messages } from '@/i18n/messages/es';

type BoundAction = (
  prev: AddSightingState,
  formData: FormData,
) => Promise<AddSightingState>;

interface SightingFormProps {
  action: BoundAction;
  t: Messages['coord_reunificacion'];
}

const INITIAL_STATE: AddSightingState = { status: 'idle' };

export function SightingForm({ action, t }: SightingFormProps) {
  const [state, formAction, pending] = useActionState<AddSightingState, FormData>(
    action,
    INITIAL_STATE,
  );

  if (state.status === 'success') {
    return (
      <p
        role="alert"
        aria-live="polite"
        className="rounded-md border border-green-400 bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
      >
        {t.sighting_added}
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.status === 'error' && <ErrorMessage message={state.message} />}

      <FormField
        htmlFor="sightingLocation"
        label={
          <>
            {t.sighting_location_label} <span aria-hidden="true">*</span>
          </>
        }
      >
        <Input
          id="sightingLocation"
          name="sightingLocation"
          type="text"
          required
          minLength={2}
          placeholder={t.sighting_location_placeholder}
        />
      </FormField>

      <FormField
        htmlFor="sightingNote"
        label={
          <>
            {t.sighting_note_label} <span aria-hidden="true">*</span>
          </>
        }
      >
        <Textarea
          id="sightingNote"
          name="sightingNote"
          required
          minLength={2}
          rows={2}
          placeholder={t.sighting_note_placeholder}
        />
      </FormField>

      <Button type="submit" disabled={pending} size="md">
        {pending ? t.adding_sighting : t.add_sighting_submit}
      </Button>
    </form>
  );
}

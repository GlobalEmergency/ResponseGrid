'use client';

import { useActionState, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { PeticionState } from './actions';
import { Button } from '@/components/atoms/button';
import { Select } from '@/components/atoms/select';
import { Input } from '@/components/atoms/input';
import { Textarea } from '@/components/atoms/textarea';
import { ErrorMessage } from '@/components/atoms/error-message';
import { FormField } from '@/components/molecules/form-field';
import { FormSuccessScreen } from '@/components/molecules/form-success-screen';
import { DraftRestoredBanner } from '@/components/atoms/draft-restored-banner';
import { useFormDraft } from '@/lib/use-form-draft';
import type { Messages } from '@/i18n/messages/es';

const INITIAL_STATE: PeticionState = { status: 'idle' };

type BoundAction = (prev: PeticionState, formData: FormData) => Promise<PeticionState>;

interface PeticionFormProps {
  action: BoundAction;
  slug: string;
  /** Optional resource to link this need to, prefilled from ?resourceId (#263). */
  resourceId?: string;
  locationPicker: ReactNode;
  orgSelector: ReactNode;
  itemsField: ReactNode;
  t: Messages['peticion'];
  backToEmergencyLabel: string;
}

export function PeticionForm({
  action,
  slug,
  resourceId,
  locationPicker,
  orgSelector,
  itemsField,
  t,
  backToEmergencyLabel,
}: PeticionFormProps) {
  const [state, formAction, pending] = useActionState<PeticionState, FormData>(
    action,
    INITIAL_STATE,
  );

  // Controlled field state — values survive the re-render triggered by a
  // validation error returned from the server action (useActionState replaces
  // the state object, which re-renders the component, but React preserves
  // useState hooks across re-renders of the same component instance).
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('');

  const draftValues = { title, description, priority };
  const draftSetters = { title: setTitle, description: setDescription, priority: setPriority };
  const { clearDraft, wasRestored } = useFormDraft(
    `peticion-${slug}`,
    draftValues,
    draftSetters,
  );

  useEffect(() => {
    if (state.status === 'success') clearDraft();
  }, [state.status, clearDraft]);

  const priorities = [
    { value: 'low', label: t.priority_low },
    { value: 'medium', label: t.priority_medium },
    { value: 'high', label: t.priority_high },
    { value: 'urgent', label: t.priority_urgent },
  ] as const;

  if (state.status === 'success') {
    return (
      <FormSuccessScreen
        message={t.success_message}
        primaryHref={`/e/${slug}/peticion`}
        primaryLabel={t.success_send_another}
        secondaryHref={`/e/${slug}`}
        secondaryLabel={backToEmergencyLabel}
      />
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {resourceId && <input type="hidden" name="resourceId" value={resourceId} />}
      {wasRestored && <DraftRestoredBanner />}

      {state.status === 'error' && (
        <ErrorMessage message={state.message ?? t.error_fallback} />
      )}

      {/* Organización — primer campo: en nombre de quién se hace la petición */}
      {orgSelector}

      <FormField
        htmlFor="title"
        label={<>{t.title_label} <span aria-hidden="true">*</span></>}
      >
        <Input
          id="title"
          name="title"
          type="text"
          required
          minLength={2}
          placeholder={t.title_placeholder}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </FormField>

      <FormField
        htmlFor="description"
        label={
          <>
            {t.description_label}{' '}
            <span className="text-muted-soft font-normal normal-case">(opcional)</span>
          </>
        }
      >
        <Textarea
          id="description"
          name="description"
          rows={3}
          placeholder={t.description_placeholder}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </FormField>

      <FormField
        htmlFor="priority"
        label={<>{t.priority_label} <span aria-hidden="true">*</span></>}
      >
        <Select
          id="priority"
          name="priority"
          required
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="" disabled>
            {t.select_priority_placeholder}
          </option>
          {priorities.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField
        htmlFor="location-search"
        label={<>{t.location_label} <span aria-hidden="true">*</span></>}
        labelAs="p"
      >
        {locationPicker}
      </FormField>

      {itemsField}

      <Button type="submit" disabled={pending} fullWidth>
        {pending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}

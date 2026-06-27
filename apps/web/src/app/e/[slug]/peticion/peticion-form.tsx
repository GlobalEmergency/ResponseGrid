'use client';

import { useActionState, useState, useEffect } from 'react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { PeticionState } from './actions';
import { Button } from '@/components/atoms/button';
import { Select } from '@/components/atoms/select';
import { Input } from '@/components/atoms/input';
import { Textarea } from '@/components/atoms/textarea';
import { ErrorMessage } from '@/components/atoms/error-message';
import { FormField } from '@/components/molecules/form-field';
import { DraftRestoredBanner } from '@/components/atoms/draft-restored-banner';
import { useFormDraft } from '@/lib/use-form-draft';
import type { Messages } from '@/i18n/messages/es';

const INITIAL_STATE: PeticionState = { status: 'idle' };

type BoundAction = (prev: PeticionState, formData: FormData) => Promise<PeticionState>;

interface PeticionFormProps {
  action: BoundAction;
  slug: string;
  locationPicker: ReactNode;
  orgSelector: ReactNode;
  itemsField: ReactNode;
  t: Messages['peticion'];
  backToEmergencyLabel: string;
}

export function PeticionForm({
  action,
  slug,
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

  // Clear draft on successful submit
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
      <section
        role="alert"
        aria-live="polite"
        className="flex flex-col gap-6 rounded-lg border-2 border-gray-900 bg-white p-6"
      >
        <p className="text-lg font-semibold text-gray-900 leading-snug">
          {t.success_message}
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href={`/e/${slug}/peticion`}
            className="flex items-center justify-center w-full py-4 px-6 text-base font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors"
            onClick={() => {
              window.location.href = `/e/${slug}/peticion`;
            }}
          >
            {t.success_send_another}
          </Link>
          <Link
            href={`/e/${slug}`}
            className="flex items-center justify-center w-full py-4 px-6 text-base font-semibold text-gray-900 bg-white border-2 border-gray-900 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors"
          >
            {backToEmergencyLabel}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {wasRestored && <DraftRestoredBanner />}

      {state.status === 'error' && (
        <ErrorMessage message={state.message ?? t.error_fallback} />
      )}

      {/* Título */}
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

      {/* Descripción */}
      <FormField
        htmlFor="description"
        label={
          <>
            {t.description_label}{' '}
            <span className="text-gray-400 font-normal normal-case">(opcional)</span>
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

      {/* Prioridad */}
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

      {/* Ubicación */}
      <FormField
        htmlFor="location-search"
        label={<>{t.location_label} <span aria-hidden="true">*</span></>}
        labelAs="p"
      >
        {locationPicker}
      </FormField>

      {/* Organización */}
      {orgSelector}

      {/* Artículos */}
      {itemsField}

      {/* Submit */}
      <Button type="submit" disabled={pending} fullWidth>
        {pending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}

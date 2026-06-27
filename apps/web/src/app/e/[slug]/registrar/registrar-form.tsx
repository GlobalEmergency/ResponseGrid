'use client';

import { useActionState, useState, useEffect } from 'react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { ActionState } from './actions';
import { Button } from '@/components/atoms/button';
import { Select } from '@/components/atoms/select';
import { Input } from '@/components/atoms/input';
import { Textarea } from '@/components/atoms/textarea';
import { ErrorMessage } from '@/components/atoms/error-message';
import { FormField } from '@/components/molecules/form-field';
import { DraftRestoredBanner } from '@/components/atoms/draft-restored-banner';
import { useFormDraft } from '@/lib/use-form-draft';
import type { Messages } from '@/i18n/messages/es';

const INITIAL_STATE: ActionState = { status: 'idle' };

type BoundAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

interface RegistrarFormProps {
  action: BoundAction;
  slug: string;
  locationPicker: ReactNode;
  orgSelector: ReactNode;
  t: Messages['registrar'];
  backToEmergencyLabel: string;
}

export function RegistrarForm({
  action,
  slug,
  locationPicker,
  orgSelector,
  t,
  backToEmergencyLabel,
}: RegistrarFormProps) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    INITIAL_STATE,
  );

  // Controlled field state — values survive the re-render triggered by a
  // validation error returned from the server action (useActionState replaces
  // the state object, which re-renders the component, but React preserves
  // useState hooks across re-renders of the same component instance).
  const [type, setType] = useState('');
  const [stage, setStage] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const draftValues = { type, stage, name, description };
  const draftSetters = { type: setType, stage: setStage, name: setName, description: setDescription };
  const { clearDraft, wasRestored } = useFormDraft(
    `registrar-${slug}`,
    draftValues,
    draftSetters,
  );

  // Clear draft on successful submit
  useEffect(() => {
    if (state.status === 'success') clearDraft();
  }, [state.status, clearDraft]);

  const resourceTypes = [
    { value: 'collection_point', label: t.type_collection_point },
    { value: 'delivery_point', label: t.type_delivery_point },
    { value: 'collection_and_delivery', label: t.type_collection_and_delivery },
    { value: 'warehouse', label: t.type_warehouse },
    { value: 'transport', label: t.type_transport },
    { value: 'supplier', label: t.type_supplier },
    { value: 'venue', label: t.type_venue },
  ] as const;

  const stages = [
    { value: 'origin', label: t.stage_origin },
    { value: 'intermediate', label: t.stage_intermediate },
    { value: 'destination', label: t.stage_destination },
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
            href={`/e/${slug}/registrar`}
            className="flex items-center justify-center w-full py-4 px-6 text-base font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors"
            onClick={() => {
              window.location.href = `/e/${slug}/registrar`;
            }}
          >
            {t.success_register_another}
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

      {/* Tipo de recurso */}
      <FormField
        htmlFor="type"
        label={<>{t.type_label} <span aria-hidden="true">*</span></>}
      >
        <Select
          id="type"
          name="type"
          required
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="" disabled>
            {t.select_type_placeholder}
          </option>
          {resourceTypes.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </FormField>

      {/* Etapa */}
      <FormField
        htmlFor="stage"
        label={<>{t.stage_label} <span aria-hidden="true">*</span></>}
      >
        <Select
          id="stage"
          name="stage"
          required
          value={stage}
          onChange={(e) => setStage(e.target.value)}
        >
          <option value="" disabled>
            {t.select_stage_placeholder}
          </option>
          {stages.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </FormField>

      {/* Nombre */}
      <FormField
        htmlFor="name"
        label={<>{t.name_label} <span aria-hidden="true">*</span></>}
      >
        <Input
          id="name"
          name="name"
          type="text"
          required
          minLength={2}
          placeholder={t.name_placeholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
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

      {/* Submit */}
      <Button type="submit" disabled={pending} fullWidth>
        {pending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}

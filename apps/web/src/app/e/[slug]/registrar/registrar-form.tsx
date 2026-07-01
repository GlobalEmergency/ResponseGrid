'use client';

import { useActionState, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { ActionState } from './actions';
import { Button } from '@/components/atoms/button';
import { Select } from '@/components/atoms/select';
import { Input } from '@/components/atoms/input';
import { Textarea } from '@/components/atoms/textarea';
import { ErrorMessage } from '@/components/atoms/error-message';
import { FormField } from '@/components/molecules/form-field';
import { FormSuccessScreen } from '@/components/molecules/form-success-screen';
import { DraftRestoredBanner } from '@/components/atoms/draft-restored-banner';
import { useFormDraft } from '@/lib/use-form-draft';
import { InventoryField } from './inventory-field';
import type { Messages } from '@/i18n/messages/es';
import type { Category } from '@/domain/supplies/category';

const INITIAL_STATE: ActionState = { status: 'idle' };

type BoundAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

interface RegistrarFormProps {
  action: BoundAction;
  slug: string;
  locationPicker: ReactNode;
  orgSelector: ReactNode;
  t: Messages['registrar'];
  backToEmergencyLabel: string;
  locale: 'es' | 'en';
  categories: readonly Category[];
}

export function RegistrarForm({
  action,
  slug,
  locationPicker,
  orgSelector,
  t,
  backToEmergencyLabel,
  locale,
  categories,
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
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const draftValues = { type, name, description };
  const draftSetters = { type: setType, name: setName, description: setDescription };
  const { clearDraft, wasRestored } = useFormDraft(
    `registrar-${slug}`,
    draftValues,
    draftSetters,
  );

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

  if (state.status === 'success') {
    return (
      <FormSuccessScreen
        message={t.success_message}
        primaryHref={`/e/${slug}/registrar`}
        primaryLabel={t.success_register_another}
        secondaryHref={`/e/${slug}`}
        secondaryLabel={backToEmergencyLabel}
      />
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {wasRestored && <DraftRestoredBanner />}

      {state.status === 'error' && (
        <ErrorMessage message={state.message ?? t.error_fallback} />
      )}

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
        htmlFor="location-search"
        label={<>{t.location_label} <span aria-hidden="true">*</span></>}
        labelAs="p"
      >
        {locationPicker}
      </FormField>

      {orgSelector}

      <InventoryField t={t} locale={locale} categories={categories} />

      <Button type="submit" disabled={pending} fullWidth>
        {pending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}

'use client';

import { useActionState, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { OfferState } from './actions';
import { Button } from '@/components/atoms/button';
import { Select } from '@/components/atoms/select';
import { Input } from '@/components/atoms/input';
import { Textarea } from '@/components/atoms/textarea';
import { ErrorMessage } from '@/components/atoms/error-message';
import { FormField } from '@/components/molecules/form-field';
import { FormSuccessScreen } from '@/components/molecules/form-success-screen';
import { DraftRestoredBanner } from '@/components/atoms/draft-restored-banner';
import { useFormDraft } from '@/lib/use-form-draft';
import { useLocale } from '@/i18n/locale-context';
import { MATERIAL_CATEGORIES, categoryLabel } from '@/lib/categories';
import type { Messages } from '@/i18n/messages/es';

const INITIAL_STATE: OfferState = { status: 'idle' };

type BoundAction = (prev: OfferState, formData: FormData) => Promise<OfferState>;

interface DonarFormProps {
  action: BoundAction;
  slug: string;
  /** The need title if this is a directed offer, undefined otherwise. */
  targetNeedTitle?: string;
  /** The need id if this is a directed offer, undefined otherwise. */
  targetNeedId?: string;
  locationPicker: ReactNode;
  orgSelector: ReactNode;
  t: Messages['donar'];
  backToEmergencyLabel: string;
}

export function DonarForm({
  action,
  slug,
  targetNeedTitle,
  targetNeedId,
  locationPicker,
  orgSelector,
  t,
  backToEmergencyLabel,
}: DonarFormProps) {
  const [state, formAction, pending] = useActionState<OfferState, FormData>(
    action,
    INITIAL_STATE,
  );
  const locale = useLocale();

  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [notes, setNotes] = useState('');

  // Draft key scoped to offer type: directed offers (by need) get their own key
  const draftKey = targetNeedId !== undefined
    ? `donar-${slug}-need-${targetNeedId}`
    : `donar-${slug}`;

  const draftValues = { category, description, quantity, unit, notes };
  const draftSetters = {
    category: setCategory,
    description: setDescription,
    quantity: setQuantity,
    unit: setUnit,
    notes: setNotes,
  };
  const { clearDraft, wasRestored } = useFormDraft(draftKey, draftValues, draftSetters);

  // Clear draft on successful submit
  useEffect(() => {
    if (state.status === 'success') clearDraft();
  }, [state.status, clearDraft]);

  const categories = MATERIAL_CATEGORIES.map((slug) => ({
    value: slug,
    label: categoryLabel(slug, locale),
  }));

  if (state.status === 'success') {
    return (
      <FormSuccessScreen
        message={t.success_message}
        primaryHref={`/e/${slug}/donar`}
        primaryLabel={t.success_donate_again}
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

      {/* Directed offer indicator */}
      {targetNeedTitle !== undefined && targetNeedId !== undefined && (
        <>
          <div
            className="rounded-lg border-2 border-warning bg-warning-soft px-4 py-3 text-sm text-warning"
            role="note"
          >
            <span className="font-semibold">{t.directed_offer_label}</span>{' '}
            {targetNeedTitle}
          </div>
          <input type="hidden" name="targetNeedId" value={targetNeedId} />
        </>
      )}

      {/* Categoría */}
      <FormField
        htmlFor="category"
        label={<>{t.category_label} <span aria-hidden="true">*</span></>}
      >
        <Select
          id="category"
          name="category"
          required
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="" disabled>
            {t.select_category_placeholder}
          </option>
          {categories.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </FormField>

      {/* Descripción */}
      <FormField
        htmlFor="description"
        label={<>{t.description_label} <span aria-hidden="true">*</span></>}
      >
        <Input
          id="description"
          name="description"
          type="text"
          required
          minLength={2}
          placeholder={t.description_placeholder}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </FormField>

      {/* Cantidad + Unidad */}
      <div className="flex gap-3">
        <div className="flex-1">
          <FormField
            htmlFor="quantity"
            label={<>{t.quantity_label} <span aria-hidden="true">*</span></>}
          >
            <Input
              id="quantity"
              name="quantity"
              type="number"
              required
              min={1}
              step={1}
              placeholder={t.quantity_placeholder}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </FormField>
        </div>
        <div className="flex-1">
          <FormField
            htmlFor="unit"
            label={
              <>
                {t.unit_label}{' '}
                <span className="text-muted-soft font-normal normal-case">(opcional)</span>
              </>
            }
          >
            <Input
              id="unit"
              name="unit"
              type="text"
              placeholder={t.unit_placeholder}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </FormField>
        </div>
      </div>

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

      {/* Notas */}
      <FormField
        htmlFor="notes"
        label={
          <>
            {t.notes_label}{' '}
            <span className="text-muted-soft font-normal normal-case">(opcional)</span>
          </>
        }
      >
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder={t.notes_placeholder}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </FormField>

      {/* Submit */}
      <Button type="submit" disabled={pending} fullWidth>
        {pending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}

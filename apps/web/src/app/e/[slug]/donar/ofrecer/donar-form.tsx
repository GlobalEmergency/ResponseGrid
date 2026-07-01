'use client';

import { useActionState, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { OfferState } from './actions';
import { Button } from '@/components/atoms/button';
import { Textarea } from '@/components/atoms/textarea';
import { ErrorMessage } from '@/components/atoms/error-message';
import { FormField } from '@/components/molecules/form-field';
import { FormSuccessScreen } from '@/components/molecules/form-success-screen';
import { DraftRestoredBanner } from '@/components/atoms/draft-restored-banner';
import { useFormDraft } from '@/lib/use-form-draft';
import { useLocale } from '@/i18n/locale-context';
import { SupplyLineFields } from '@/components/molecules/supply-line-fields';
import type { SupplyLine } from '@/domain/supplies/supply-line';
import type { Category } from '@/domain/supplies/category';
import type { Messages } from '@/i18n/messages/es';

const INITIAL_STATE: OfferState = { status: 'idle' };

type BoundAction = (prev: OfferState, formData: FormData) => Promise<OfferState>;

interface DonarFormProps {
  action: BoundAction;
  slug: string;
  targetNeedTitle?: string;
  targetNeedId?: string;
  locationPicker: ReactNode;
  orgSelector: ReactNode;
  t: Messages['donar'];
  backToEmergencyLabel: string;
  categories: readonly Category[];
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
  categories,
}: DonarFormProps) {
  const [state, formAction, pending] = useActionState<OfferState, FormData>(
    action,
    INITIAL_STATE,
  );
  const locale = useLocale();

  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [supplyId, setSupplyId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('');
  const [notes, setNotes] = useState('');

  // Draft key scoped to offer type: directed offers (by need) get their own key
  const draftKey = targetNeedId !== undefined
    ? `donar-${slug}-need-${targetNeedId}`
    : `donar-${slug}`;

  const draftValues = { category, description, supplyId, quantity, unit, notes };
  const draftSetters = {
    category: setCategory,
    description: setDescription,
    supplyId: setSupplyId,
    quantity: setQuantity,
    unit: setUnit,
    notes: setNotes,
  };
  const { clearDraft, wasRestored } = useFormDraft(draftKey, draftValues, draftSetters);

  useEffect(() => {
    if (state.status === 'success') clearDraft();
  }, [state.status, clearDraft]);

  // The single-line SupplyLine model driving <SupplyLineFields>; its parts are
  // the same controlled strings the draft mechanism persists (draft values must
  // stay plain strings — see useFormDraft), converted to/from SupplyLine here.
  const line: SupplyLine = {
    name: description,
    supplyId: supplyId === '' ? null : supplyId,
    quantity: Math.max(1, Math.floor(Number(quantity) || 1)),
    unit,
    category,
  };

  const handleLineChange = (patch: Partial<SupplyLine>) => {
    if (patch.name !== undefined) setDescription(patch.name);
    if (patch.supplyId !== undefined) setSupplyId(patch.supplyId ?? '');
    if (patch.quantity !== undefined) setQuantity(String(patch.quantity));
    if (patch.unit !== undefined) setUnit(patch.unit);
    if (patch.category !== undefined) setCategory(patch.category);
  };

  if (state.status === 'success') {
    return (
      <FormSuccessScreen
        message={t.success_message}
        primaryHref={`/e/${slug}/donar/ofrecer`}
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

      <SupplyLineFields
        idPrefix="offer"
        rowId="0"
        index={0}
        required
        removable={false}
        categories={categories}
        locale={locale}
        value={line}
        onChange={handleLineChange}
        onRemove={() => {}}
        hideHeader
        labels={{
          nameLabel: t.description_label,
          namePlaceholder: t.description_placeholder,
          quantityLabel: t.quantity_label,
          unitLabel: t.unit_label,
          unitPlaceholder: t.unit_placeholder,
          categoryLabel: t.category_label,
        }}
      />
      {/* Hidden inputs post the same field names the server action expects */}
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="supplyId" value={supplyId} />
      <input type="hidden" name="description" value={description} />
      <input type="hidden" name="quantity" value={quantity} />
      <input type="hidden" name="unit" value={unit} />

      <FormField
        htmlFor="location-search"
        label={<>{t.location_label} <span aria-hidden="true">*</span></>}
        labelAs="p"
      >
        {locationPicker}
      </FormField>

      {orgSelector}

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

      <Button type="submit" disabled={pending} fullWidth>
        {pending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}

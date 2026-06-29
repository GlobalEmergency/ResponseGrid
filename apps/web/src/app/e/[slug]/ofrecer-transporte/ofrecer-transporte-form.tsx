'use client';

import { useActionState, useState, useEffect } from 'react';
import type { CapacityState } from './actions';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Textarea } from '@/components/atoms/textarea';
import { ErrorMessage } from '@/components/atoms/error-message';
import { FormField } from '@/components/molecules/form-field';
import { FormSuccessScreen } from '@/components/molecules/form-success-screen';
import { DraftRestoredBanner } from '@/components/atoms/draft-restored-banner';
import { useFormDraft } from '@/lib/use-form-draft';
import type { Messages } from '@/i18n/messages/es';

const INITIAL_STATE: CapacityState = { status: 'idle' };

type BoundAction = (
  prev: CapacityState,
  formData: FormData,
) => Promise<CapacityState>;

interface OfrecerTransporteFormProps {
  action: BoundAction;
  slug: string;
  t: Messages['ofrecerTransporte'];
  backToEmergencyLabel: string;
}

export function OfrecerTransporteForm({
  action,
  slug,
  t,
  backToEmergencyLabel,
}: OfrecerTransporteFormProps) {
  const [state, formAction, pending] = useActionState<CapacityState, FormData>(
    action,
    INITIAL_STATE,
  );

  const [mode, setMode] = useState('road');
  const [weightKg, setWeightKg] = useState('');
  const [volumeM3, setVolumeM3] = useState('');
  const [coverageArea, setCoverageArea] = useState('');
  const [notes, setNotes] = useState('');

  // Draft persistence — only the text/number fields (constraints + window are
  // transient). Mirrors donar/peticion.
  const draftValues = { mode, weightKg, volumeM3, coverageArea, notes };
  const draftSetters = {
    mode: setMode,
    weightKg: setWeightKg,
    volumeM3: setVolumeM3,
    coverageArea: setCoverageArea,
    notes: setNotes,
  };
  const { clearDraft, wasRestored } = useFormDraft(
    `ofrecer-transporte-${slug}`,
    draftValues,
    draftSetters,
  );

  useEffect(() => {
    if (state.status === 'success') clearDraft();
  }, [state.status, clearDraft]);

  const modes = [
    { value: 'road', label: t.mode_road },
    { value: 'sea', label: t.mode_sea },
    { value: 'air', label: t.mode_air },
  ] as const;

  const constraints = [
    { name: 'constraint_refrigerated', label: t.constraint_refrigerated },
    { name: 'constraint_hazmat', label: t.constraint_hazmat },
    { name: 'constraint_fragile', label: t.constraint_fragile },
  ] as const;

  if (state.status === 'success') {
    return (
      <FormSuccessScreen
        message={t.success_message}
        primaryHref={`/e/${slug}/ofrecer-transporte`}
        primaryLabel={t.success_offer_again}
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

      <p className="text-sm text-muted">{t.intro}</p>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-ink uppercase tracking-wide">
          {t.mode_label} <span aria-hidden="true">*</span>
        </legend>
        <div className="grid grid-cols-3 gap-2" role="radiogroup">
          {modes.map(({ value, label }) => {
            const selected = mode === value;
            return (
              <label
                key={value}
                className={`flex min-h-[44px] cursor-pointer items-center justify-center rounded-lg border-[1.5px] px-3 py-2.5 text-center text-sm font-semibold transition-colors focus-within:ring-2 focus-within:ring-accent/40 ${
                  selected
                    ? 'border-navy bg-navy text-white'
                    : 'border-line-strong bg-white text-ink hover:bg-surface'
                }`}
              >
                <input
                  type="radio"
                  name="mode"
                  value={value}
                  checked={selected}
                  onChange={(e) => setMode(e.target.value)}
                  className="sr-only"
                />
                {label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-ink uppercase tracking-wide">
          {t.capacity_legend} <span aria-hidden="true">*</span>
        </legend>
        <p className="text-xs text-muted">{t.capacity_hint}</p>
        <div className="flex gap-3">
          <div className="flex-1">
            <FormField htmlFor="weightKg" label={t.weight_label}>
              <Input
                id="weightKg"
                name="weightKg"
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                placeholder={t.weight_placeholder}
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
              />
            </FormField>
          </div>
          <div className="flex-1">
            <FormField htmlFor="volumeM3" label={t.volume_label}>
              <Input
                id="volumeM3"
                name="volumeM3"
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                placeholder={t.volume_placeholder}
                value={volumeM3}
                onChange={(e) => setVolumeM3(e.target.value)}
              />
            </FormField>
          </div>
        </div>
      </fieldset>

      <FormField
        htmlFor="coverageArea"
        label={<>{t.coverage_label} <span aria-hidden="true">*</span></>}
      >
        <Input
          id="coverageArea"
          name="coverageArea"
          type="text"
          required
          placeholder={t.coverage_placeholder}
          value={coverageArea}
          onChange={(e) => setCoverageArea(e.target.value)}
        />
      </FormField>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-ink uppercase tracking-wide">
          {t.window_legend}{' '}
          <span className="text-muted-soft font-normal normal-case">(opcional)</span>
        </legend>
        <div className="flex gap-3">
          <div className="flex-1">
            <FormField htmlFor="windowFrom" label={t.window_from_label}>
              <Input
                id="windowFrom"
                name="windowFrom"
                type="datetime-local"
              />
            </FormField>
          </div>
          <div className="flex-1">
            <FormField htmlFor="windowTo" label={t.window_to_label}>
              <Input id="windowTo" name="windowTo" type="datetime-local" />
            </FormField>
          </div>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-ink uppercase tracking-wide">
          {t.constraints_legend}{' '}
          <span className="text-muted-soft font-normal normal-case">(opcional)</span>
        </legend>
        <div className="flex flex-col gap-1">
          {constraints.map(({ name, label }) => (
            <label
              key={name}
              className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg px-1 text-base text-ink"
            >
              <input
                type="checkbox"
                name={name}
                className="h-5 w-5 rounded border-line-strong text-navy focus:ring-2 focus:ring-accent/40"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

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

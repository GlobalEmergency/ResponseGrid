'use client';

import { useActionState, useState, useRef, useCallback } from 'react';
import type { ReportValidityState } from './actions';
import { Button } from '@/components/atoms/button';
import { Select } from '@/components/atoms/select';
import { Textarea } from '@/components/atoms/textarea';
import { ErrorMessage } from '@/components/atoms/error-message';
import { FormField } from '@/components/molecules/form-field';
import { FormSuccessScreen } from '@/components/molecules/form-success-screen';
import { PhotoUploader } from '@/components/molecules/photo-uploader';
import type { Messages } from '@/i18n/messages/es';

const INITIAL_STATE: ReportValidityState = { status: 'idle' };

type BoundAction = (
  prev: ReportValidityState,
  formData: FormData,
) => Promise<ReportValidityState>;

interface ReportValidezFormProps {
  action: BoundAction;
  slug: string;
  resourceId: string;
  t: Messages['reportar_validez'];
  backLabel: string;
}

export function ReportValidezForm({
  action,
  slug,
  resourceId,
  t,
  backLabel,
}: ReportValidezFormProps) {
  const [state, formAction, pending] = useActionState<
    ReportValidityState,
    FormData
  >(action, INITIAL_STATE);

  const [reason, setReason] = useState('');
  const photoUrlsRef = useRef<string[]>([]);

  const handlePhotoUrlsChange = useCallback((urls: string[]) => {
    photoUrlsRef.current = urls;
  }, []);

  const reasons = [
    { value: 'closed', label: t.reason_closed },
    { value: 'nonexistent', label: t.reason_nonexistent },
    { value: 'moved', label: t.reason_moved },
    { value: 'outdated', label: t.reason_outdated },
  ] as const;

  if (state.status === 'success') {
    return (
      <FormSuccessScreen
        message={t.success_message}
        primaryHref={`/e/${slug}/recursos/${resourceId}`}
        primaryLabel={t.success_back_to_point}
        secondaryHref={`/e/${slug}`}
        secondaryLabel={backLabel}
      />
    );
  }

  return (
    <form
      action={(formData: FormData) => {
        formData.set('photoUrls', JSON.stringify(photoUrlsRef.current));
        formAction(formData);
      }}
      className="flex flex-col gap-6"
      noValidate
    >
      {state.status === 'error' && (
        <ErrorMessage message={state.message ?? t.error_fallback} />
      )}

      {/* Motivo */}
      <FormField
        htmlFor="reason"
        label={
          <>
            {t.reason_label} <span aria-hidden="true">*</span>
          </>
        }
      >
        <Select
          id="reason"
          name="reason"
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        >
          <option value="" disabled>
            {t.select_reason_placeholder}
          </option>
          {reasons.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </FormField>

      {/* Nota (opcional) */}
      <FormField htmlFor="note" label={t.note_label}>
        <Textarea
          id="note"
          name="note"
          rows={3}
          placeholder={t.note_placeholder}
        />
      </FormField>

      {/* Fotos (opcional) */}
      <PhotoUploader onUrlsChange={handlePhotoUrlsChange} />

      <Button type="submit" disabled={pending} fullWidth>
        {pending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}

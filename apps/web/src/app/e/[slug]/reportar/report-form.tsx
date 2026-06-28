'use client';

import { useActionState, useState, useRef, useCallback, useEffect } from 'react';
import type { SubmitReportState } from './actions';
import { Button } from '@/components/atoms/button';
import { Select } from '@/components/atoms/select';
import { Textarea } from '@/components/atoms/textarea';
import { ErrorMessage } from '@/components/atoms/error-message';
import { FormField } from '@/components/molecules/form-field';
import { FormSuccessScreen } from '@/components/molecules/form-success-screen';
import { PhotoUploader } from '@/components/molecules/photo-uploader';
import { DraftRestoredBanner } from '@/components/atoms/draft-restored-banner';
import { useFormDraft } from '@/lib/use-form-draft';
import type { Messages } from '@/i18n/messages/es';

const INITIAL_STATE: SubmitReportState = { status: 'idle' };

type BoundAction = (prev: SubmitReportState, formData: FormData) => Promise<SubmitReportState>;

interface ReportFormProps {
  action: BoundAction;
  slug: string;
  myResources: Array<{ id: string; name: string }>;
  prefilledResourceId?: string;
  t: Messages['reportar'];
  backToEmergencyLabel: string;
}

export function ReportForm({
  action,
  slug,
  myResources,
  prefilledResourceId,
  t,
  backToEmergencyLabel,
}: ReportFormProps) {
  const [state, formAction, pending] = useActionState<SubmitReportState, FormData>(
    action,
    INITIAL_STATE,
  );

  const [type, setType] = useState('');
  const [priority, setPriority] = useState('');
  const [note, setNote] = useState('');
  const [resourceId, setResourceId] = useState(prefilledResourceId ?? '');
  const photoUrlsRef = useRef<string[]>([]);

  const draftValues = { type, priority, note, resourceId };
  const draftSetters = {
    type: setType,
    priority: setPriority,
    note: setNote,
    resourceId: setResourceId,
  };
  const { clearDraft, wasRestored } = useFormDraft(
    `reportar-${slug}`,
    draftValues,
    draftSetters,
  );

  // Clear draft on successful submit
  useEffect(() => {
    if (state.status === 'success') clearDraft();
  }, [state.status, clearDraft]);

  const handlePhotoUrlsChange = useCallback((urls: string[]) => {
    photoUrlsRef.current = urls;
  }, []);

  const reportTypes = [
    { value: 'incident', label: t.type_incident },
    { value: 'stock', label: t.type_stock },
    { value: 'status', label: t.type_status },
    { value: 'other', label: t.type_other },
  ] as const;

  const reportPriorities = [
    { value: 'low', label: t.priority_low },
    { value: 'medium', label: t.priority_medium },
    { value: 'high', label: t.priority_high },
    { value: 'urgent', label: t.priority_urgent },
  ] as const;

  if (state.status === 'success') {
    return (
      <FormSuccessScreen
        message={t.success_message}
        primaryHref={`/e/${slug}/reportar`}
        primaryLabel={t.success_send_another}
        secondaryHref={`/e/${slug}`}
        secondaryLabel={backToEmergencyLabel}
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
      {wasRestored && <DraftRestoredBanner />}

      {state.status === 'error' && (
        <ErrorMessage message={state.message ?? t.error_fallback} />
      )}

      {/* Tipo */}
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
          <option value="" disabled>{t.select_type_placeholder}</option>
          {reportTypes.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
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
          <option value="" disabled>{t.select_priority_placeholder}</option>
          {reportPriorities.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
      </FormField>

      {/* Nota */}
      <FormField
        htmlFor="note"
        label={<>{t.note_label} <span aria-hidden="true">*</span></>}
      >
        <Textarea
          id="note"
          name="note"
          rows={4}
          required
          placeholder={t.note_placeholder}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </FormField>

      {/* Punto relacionado */}
      {myResources.length > 0 && (
        <FormField
          htmlFor="resourceId"
          label={t.related_point_label}
        >
          <Select
            id="resourceId"
            name="resourceId"
            value={resourceId}
            onChange={(e) => setResourceId(e.target.value)}
          >
            <option value="">{t.general_no_point}</option>
            {myResources.map(({ id, name }) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </Select>
        </FormField>
      )}

      {/* Hidden field for resourceId when no resources to show selector */}
      {myResources.length === 0 && prefilledResourceId != null && (
        <input type="hidden" name="resourceId" value={prefilledResourceId} />
      )}

      {/* Fotos */}
      <PhotoUploader onUrlsChange={handlePhotoUrlsChange} />

      {/* Submit */}
      <Button type="submit" disabled={pending} fullWidth>
        {pending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}

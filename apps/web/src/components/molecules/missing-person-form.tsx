'use client';

import { useActionState, useState, useEffect } from 'react';
import Link from 'next/link';
import type { BuscarFamiliarState } from '@/app/e/[slug]/buscar-familiar/actions';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Textarea } from '@/components/atoms/textarea';
import { ErrorMessage } from '@/components/atoms/error-message';
import { FormField } from '@/components/molecules/form-field';
import { DraftRestoredBanner } from '@/components/atoms/draft-restored-banner';
import { ConsentCheckbox } from '@/components/atoms/consent-checkbox';
import { PrivacyNote } from '@/components/atoms/privacy-note';
import { useFormDraft } from '@/lib/use-form-draft';
import type { Messages } from '@/i18n/messages/es';

type BoundAction = (
  prev: BuscarFamiliarState,
  formData: FormData,
) => Promise<BuscarFamiliarState>;

interface MissingPersonFormProps {
  action: BoundAction;
  slug: string;
  t: Messages['buscar_familiar'];
}

const INITIAL_STATE: BuscarFamiliarState = { status: 'idle' };

export function MissingPersonForm({ action, slug, t }: MissingPersonFormProps) {
  const [state, formAction, pending] = useActionState<
    BuscarFamiliarState,
    FormData
  >(action, INITIAL_STATE);

  // Controlled fields for draft persistence (only string values)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [approximateAge, setApproximateAge] = useState('');
  const [lastKnownLocation, setLastKnownLocation] = useState('');
  const [description, setDescription] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');

  const draftValues = {
    firstName,
    lastName,
    documentId,
    approximateAge,
    lastKnownLocation,
    description,
    reporterName,
    reporterPhone,
    reporterEmail,
  };

  const draftSetters = {
    firstName: setFirstName,
    lastName: setLastName,
    documentId: setDocumentId,
    approximateAge: setApproximateAge,
    lastKnownLocation: setLastKnownLocation,
    description: setDescription,
    reporterName: setReporterName,
    reporterPhone: setReporterPhone,
    reporterEmail: setReporterEmail,
  };

  const { clearDraft, wasRestored } = useFormDraft(
    `buscar-familiar-${slug}`,
    draftValues,
    draftSetters,
  );

  useEffect(() => {
    if (state.status === 'success') clearDraft();
  }, [state.status, clearDraft]);

  if (state.status === 'success') {
    return (
      <section
        role="alert"
        aria-live="polite"
        className="flex flex-col gap-6 rounded-lg border-2 border-gray-900 bg-white p-6"
      >
        <h2 className="text-lg font-semibold text-gray-900">
          {t.success_title}
        </h2>
        <p className="text-sm text-gray-700 leading-relaxed">{t.success_body}</p>
        <PrivacyNote />
        <Link
          href={`/e/${slug}`}
          className="flex items-center justify-center w-full py-4 px-6 text-base font-semibold text-gray-900 bg-white border-2 border-gray-900 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors"
        >
          {t.back_to_emergency}
        </Link>
      </section>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {wasRestored && <DraftRestoredBanner />}

      <PrivacyNote />

      {state.status === 'error' && <ErrorMessage message={state.message} />}

      {/* ── Datos de la persona buscada ─────────────────────────────── */}
      <fieldset className="flex flex-col gap-5 rounded-lg border-2 border-gray-200 p-4">
        <legend className="text-sm font-bold text-gray-900 uppercase tracking-wide px-1">
          {t.person_section}
        </legend>

        <FormField
          htmlFor="firstName"
          label={
            <>
              {t.first_name_label} <span aria-hidden="true">*</span>
            </>
          }
        >
          <Input
            id="firstName"
            name="firstName"
            type="text"
            required
            minLength={1}
            placeholder={t.first_name_placeholder}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
          />
        </FormField>

        <FormField
          htmlFor="lastName"
          label={
            <>
              {t.last_name_label} <span aria-hidden="true">*</span>
            </>
          }
        >
          <Input
            id="lastName"
            name="lastName"
            type="text"
            required
            minLength={1}
            placeholder={t.last_name_placeholder}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="family-name"
          />
        </FormField>

        <FormField
          htmlFor="documentId"
          label={`${t.document_id_label} (opcional)`}
        >
          <Input
            id="documentId"
            name="documentId"
            type="text"
            placeholder={t.document_id_placeholder}
            value={documentId}
            onChange={(e) => setDocumentId(e.target.value)}
            autoComplete="off"
          />
        </FormField>

        <FormField
          htmlFor="approximateAge"
          label={`${t.approximate_age_label} (opcional)`}
        >
          <Input
            id="approximateAge"
            name="approximateAge"
            type="number"
            min={0}
            max={120}
            placeholder={t.approximate_age_placeholder}
            value={approximateAge}
            onChange={(e) => setApproximateAge(e.target.value)}
          />
        </FormField>

        <FormField
          htmlFor="lastKnownLocation"
          label={
            <>
              {t.last_known_location_label} <span aria-hidden="true">*</span>
            </>
          }
        >
          <Input
            id="lastKnownLocation"
            name="lastKnownLocation"
            type="text"
            required
            minLength={2}
            placeholder={t.last_known_location_placeholder}
            value={lastKnownLocation}
            onChange={(e) => setLastKnownLocation(e.target.value)}
          />
        </FormField>

        <FormField
          htmlFor="description"
          label={`${t.description_label} (opcional)`}
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
      </fieldset>

      {/* ── Datos de contacto del solicitante ──────────────────────── */}
      <fieldset className="flex flex-col gap-5 rounded-lg border-2 border-gray-200 p-4">
        <legend className="text-sm font-bold text-gray-900 uppercase tracking-wide px-1">
          {t.reporter_section}
        </legend>

        <FormField
          htmlFor="reporterName"
          label={
            <>
              {t.reporter_name_label} <span aria-hidden="true">*</span>
            </>
          }
        >
          <Input
            id="reporterName"
            name="reporterName"
            type="text"
            required
            minLength={2}
            placeholder={t.reporter_name_placeholder}
            value={reporterName}
            onChange={(e) => setReporterName(e.target.value)}
            autoComplete="name"
          />
        </FormField>

        <FormField
          htmlFor="reporterPhone"
          label={
            <>
              {t.reporter_phone_label} <span aria-hidden="true">*</span>
            </>
          }
        >
          <Input
            id="reporterPhone"
            name="reporterPhone"
            type="tel"
            required
            minLength={6}
            placeholder={t.reporter_phone_placeholder}
            value={reporterPhone}
            onChange={(e) => setReporterPhone(e.target.value)}
            autoComplete="tel"
          />
        </FormField>

        <FormField
          htmlFor="reporterEmail"
          label={`${t.reporter_email_label} (opcional)`}
        >
          <Input
            id="reporterEmail"
            name="reporterEmail"
            type="email"
            placeholder={t.reporter_email_placeholder}
            value={reporterEmail}
            onChange={(e) => setReporterEmail(e.target.value)}
            autoComplete="email"
          />
        </FormField>
      </fieldset>

      {/* ── Consentimiento ──────────────────────────────────────────── */}
      <ConsentCheckbox
        id="consentGiven"
        name="consentGiven"
        label={t.consent_text}
      />

      <Button type="submit" disabled={pending} fullWidth>
        {pending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}

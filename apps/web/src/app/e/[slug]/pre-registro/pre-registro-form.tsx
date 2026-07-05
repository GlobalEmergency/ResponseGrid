'use client';

import { useActionState, useState, useEffect } from 'react';
import type { PreRegState } from './actions';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { ErrorMessage } from '@/components/atoms/error-message';
import { FormField } from '@/components/molecules/form-field';
import { DraftRestoredBanner } from '@/components/atoms/draft-restored-banner';
import { IntakeReceipt } from '@/components/molecules/intake-receipt';
import { InventoryField } from '@/app/e/[slug]/registrar/inventory-field';
import { useFormDraft } from '@/lib/use-form-draft';
import type { Messages } from '@/i18n/messages/es';
import type { Category } from '@/domain/supplies/category';

const INITIAL_STATE: PreRegState = { status: 'idle' };

type BoundAction = (
  prev: PreRegState,
  formData: FormData,
) => Promise<PreRegState>;

/** The logged-in donor's account contact, used to prefill/lock the form. */
export interface PreRegDonorProfile {
  name: string;
  email: string;
  phone: string | null;
}

interface PreRegistroFormProps {
  action: BoundAction;
  slug: string;
  resourceId: string;
  pointName: string;
  t: Messages['prereg'];
  locale: 'es' | 'en';
  backToEmergencyLabel: string;
  categories: readonly Category[];
  /**
   * When set the donor is logged in: name/email come from their account (and so
   * does the phone when they have one), and no local draft is kept.
   */
  profile?: PreRegDonorProfile | null;
}

export function PreRegistroForm({
  action,
  slug,
  resourceId,
  pointName,
  t,
  locale,
  backToEmergencyLabel,
  categories,
  profile = null,
}: PreRegistroFormProps) {
  const [state, formAction, pending] = useActionState<PreRegState, FormData>(
    action,
    INITIAL_STATE,
  );

  const loggedIn = profile != null;
  const phoneLocked =
    loggedIn && profile?.phone != null && profile.phone !== '';

  const [donorName, setDonorName] = useState(profile?.name ?? '');
  const [donorEmail, setDonorEmail] = useState(profile?.email ?? '');
  const [donorPhone, setDonorPhone] = useState(profile?.phone ?? '');

  const draftValues = { donorName, donorEmail, donorPhone };
  const draftSetters = {
    donorName: setDonorName,
    donorEmail: setDonorEmail,
    donorPhone: setDonorPhone,
  };
  // A logged-in donor's contact is authoritative (and re-applied server-side),
  // so we don't restore/persist a local draft for them.
  const { clearDraft, wasRestored } = useFormDraft(
    `prereg-${slug}-${resourceId}`,
    draftValues,
    draftSetters,
    { enabled: !loggedIn },
  );

  useEffect(() => {
    if (state.status === 'success') clearDraft();
  }, [state.status, clearDraft]);

  if (state.status === 'success') {
    return (
      <IntakeReceipt
        code={state.code}
        trackUrl={`/e/${slug}/donacion/${state.code}`}
        title={t.success_title}
        body={t.success_body.replace('{pointName}', pointName)}
        codeLabel={t.code_label}
        qrAlt={t.qr_alt}
        primaryHref={`/e/${slug}/pre-registro?resourceId=${resourceId}`}
        primaryLabel={t.success_register_another}
        secondaryHref={`/e/${slug}`}
        secondaryLabel={backToEmergencyLabel}
      />
    );
  }

  const lockedClass = 'bg-surface text-muted';

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {wasRestored && <DraftRestoredBanner />}

      {state.status === 'error' && (
        <ErrorMessage message={state.message ?? t.err_submit_failed} />
      )}

      {loggedIn && (
        <p className="rounded-lg border-2 border-line bg-surface px-4 py-3 text-sm text-muted">
          {t.account_contact_note}
        </p>
      )}

      <FormField
        htmlFor="donorName"
        label={
          <>
            {t.donor_name_label} <span aria-hidden="true">*</span>
          </>
        }
      >
        <Input
          id="donorName"
          name="donorName"
          type="text"
          required
          minLength={1}
          placeholder={t.donor_name_placeholder}
          value={donorName}
          onChange={(e) => setDonorName(e.target.value)}
          readOnly={loggedIn}
          className={loggedIn ? lockedClass : ''}
        />
      </FormField>

      <fieldset className="flex flex-col gap-4 rounded-lg border-2 border-line p-4">
        <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-ink">
          {t.contact_heading}
        </legend>
        {!loggedIn && <p className="text-xs text-muted">{t.contact_hint}</p>}

        <FormField htmlFor="donorEmail" label={t.email_label}>
          <Input
            id="donorEmail"
            name="donorEmail"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={t.email_placeholder}
            value={donorEmail}
            onChange={(e) => setDonorEmail(e.target.value)}
            readOnly={loggedIn}
            className={loggedIn ? lockedClass : ''}
          />
        </FormField>

        <FormField htmlFor="donorPhone" label={t.phone_label}>
          <Input
            id="donorPhone"
            name="donorPhone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder={t.phone_placeholder}
            value={donorPhone}
            onChange={(e) => setDonorPhone(e.target.value)}
            readOnly={phoneLocked}
            className={phoneLocked ? lockedClass : ''}
          />
        </FormField>
      </fieldset>

      <InventoryField t={t.lines} locale={locale} categories={categories} startWithOneRow />

      <Button type="submit" disabled={pending} fullWidth>
        {pending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}

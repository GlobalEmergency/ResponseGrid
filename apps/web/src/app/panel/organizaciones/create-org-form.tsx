'use client';

import { useActionState } from 'react';
import { createOrganizationAction, type OrgActionResult } from './actions';
import { Input } from '@/components/atoms/input';
import { Select } from '@/components/atoms/select';
import { Button } from '@/components/atoms/button';
import { ErrorMessage } from '@/components/atoms/error-message';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';

const INITIAL_STATE: OrgActionResult = { status: 'idle' };

export function CreateOrgForm() {
  const m = getMessages(useLocale());
  const to = m.organizaciones;
  const ORG_TYPES = [
    { value: 'ngo', label: to.f_type_ngo },
    { value: 'company', label: to.f_type_company },
    { value: 'public_admin', label: to.f_type_public },
    { value: 'association', label: to.f_type_association },
    { value: 'transport_operator', label: to.f_type_transport },
    { value: 'other', label: to.f_type_other },
  ];

  const [state, formAction, pending] = useActionState<OrgActionResult, FormData>(
    createOrganizationAction,
    INITIAL_STATE,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5 rounded-lg border-2 border-line p-6">
      {state.status === 'error' && (
        <ErrorMessage message={state.message ?? to.form_error} />
      )}

      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="org-name" className="text-sm font-semibold text-ink">
          {to.f_name} <span aria-hidden="true">*</span>
        </label>
        <Input id="org-name" name="name" type="text" required placeholder={to.f_name_ph} />
      </div>

      {/* Type */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="org-type" className="text-sm font-semibold text-ink">
          {to.f_type} <span aria-hidden="true">*</span>
        </label>
        <Select id="org-type" name="type" required defaultValue="">
          <option value="" disabled>{to.f_type_ph}</option>
          {ORG_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </Select>
      </div>

      {/* Tax ID */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="org-taxid" className="text-sm font-semibold text-ink">
          {to.f_taxid}
          <span className="ml-1 text-xs font-normal text-muted">{m.common.optional}</span>
        </label>
        <Input id="org-taxid" name="taxId" type="text" placeholder="ES-12345678" />
      </div>

      {/* Contact email */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="org-email" className="text-sm font-semibold text-ink">
          {to.f_email} <span aria-hidden="true">*</span>
        </label>
        <Input id="org-email" name="contactEmail" type="email" required placeholder={to.f_email_ph} />
      </div>

      {/* Contact phone */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="org-phone" className="text-sm font-semibold text-ink">
          {to.f_phone} <span aria-hidden="true">*</span>
        </label>
        <Input id="org-phone" name="contactPhone" type="tel" required placeholder={to.f_phone_ph} />
      </div>

      <Button type="submit" disabled={pending} fullWidth>
        {pending ? to.creating : to.create_heading}
      </Button>
    </form>
  );
}

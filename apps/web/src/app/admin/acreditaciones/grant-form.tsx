'use client';

import { useActionState, useState } from 'react';
import { grantAccreditationAction } from './actions';
import type { AccreditationActionResult } from './actions';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { FormField } from '@/components/molecules/form-field';
import { ErrorMessage } from '@/components/atoms/error-message';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';

const INITIAL_STATE: AccreditationActionResult = { status: 'idle' };

export function GrantAccreditationForm() {
  const ta = getMessages(useLocale()).admin;
  const [state, formAction, pending] = useActionState(
    grantAccreditationAction,
    INITIAL_STATE,
  );

  const [scopeType, setScopeType] = useState<'global' | 'emergency'>('global');

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.status === 'error' && (
        <ErrorMessage message={state.message} />
      )}

      {state.status === 'success' && (
        <p
          role="status"
          className="rounded-md border border-success bg-success-soft px-4 py-3 text-sm font-medium text-success"
        >
          {ta.acc_form_success}
        </p>
      )}

      <FormField htmlFor="organizationId" label={ta.acc_f_org_label}>
        <Input
          id="organizationId"
          name="organizationId"
          type="text"
          placeholder={ta.acc_f_org_ph}
          required
          autoComplete="off"
        />
      </FormField>

      {/* Scope radio group */}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-ink uppercase tracking-wide">
          {ta.acc_f_scope_legend}
        </legend>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-ink">
            <input
              type="radio"
              name="scopeType"
              value="global"
              checked={scopeType === 'global'}
              onChange={() => setScopeType('global')}
              className="accent-navy"
            />
            {ta.acc_f_scope_global}
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-ink">
            <input
              type="radio"
              name="scopeType"
              value="emergency"
              checked={scopeType === 'emergency'}
              onChange={() => setScopeType('emergency')}
              className="accent-navy"
            />
            {ta.acc_f_scope_emergency}
          </label>
        </div>
      </fieldset>

      {scopeType === 'emergency' && (
        <FormField htmlFor="emergencyId" label={ta.acc_f_emergency_label}>
          <Input
            id="emergencyId"
            name="emergencyId"
            type="text"
            placeholder={ta.acc_f_emergency_ph}
            required={scopeType === 'emergency'}
            autoComplete="off"
          />
        </FormField>
      )}

      <FormField htmlFor="evidence" label={ta.acc_f_evidence_label}>
        <Input
          id="evidence"
          name="evidence"
          type="text"
          placeholder={ta.acc_f_evidence_ph}
          autoComplete="off"
        />
      </FormField>

      <Button type="submit" disabled={pending} size="md">
        {pending ? ta.acc_f_granting : ta.acc_f_submit}
      </Button>
    </form>
  );
}

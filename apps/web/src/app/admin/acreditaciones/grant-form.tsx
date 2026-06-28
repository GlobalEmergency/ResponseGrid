'use client';

import { useActionState, useState } from 'react';
import { grantAccreditationAction } from './actions';
import type { AccreditationActionResult } from './actions';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { FormField } from '@/components/molecules/form-field';
import { ErrorMessage } from '@/components/atoms/error-message';

const INITIAL_STATE: AccreditationActionResult = { status: 'idle' };

export function GrantAccreditationForm() {
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
          className="rounded-md border border-green-500 bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
        >
          Acreditación concedida correctamente.
        </p>
      )}

      <FormField htmlFor="organizationId" label="ID de organización">
        <Input
          id="organizationId"
          name="organizationId"
          type="text"
          placeholder="UUID de la organización"
          required
          autoComplete="off"
        />
      </FormField>

      {/* Scope radio group */}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-ink uppercase tracking-wide">
          Alcance
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
            Global (válida para todas las emergencias)
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
            Esta emergencia (emergencia específica)
          </label>
        </div>
      </fieldset>

      {scopeType === 'emergency' && (
        <FormField htmlFor="emergencyId" label="ID de emergencia">
          <Input
            id="emergencyId"
            name="emergencyId"
            type="text"
            placeholder="UUID de la emergencia"
            required={scopeType === 'emergency'}
            autoComplete="off"
          />
        </FormField>
      )}

      <FormField htmlFor="evidence" label="Evidencia (opcional)">
        <Input
          id="evidence"
          name="evidence"
          type="text"
          placeholder="URL o referencia documental"
          autoComplete="off"
        />
      </FormField>

      <Button type="submit" disabled={pending} size="md">
        {pending ? 'Concediendo…' : 'Conceder acreditación'}
      </Button>
    </form>
  );
}

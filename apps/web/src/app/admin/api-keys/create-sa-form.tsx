'use client';

import { useActionState } from 'react';
import { createServiceAccountAction } from './actions';
import type { ApiKeyActionResult } from './actions';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { FormField } from '@/components/molecules/form-field';
import { ErrorMessage } from '@/components/atoms/error-message';

const INITIAL_STATE: ApiKeyActionResult = { status: 'idle' };

export function CreateServiceAccountForm() {
  const [state, formAction, pending] = useActionState(
    createServiceAccountAction,
    INITIAL_STATE,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.status === 'error' && <ErrorMessage message={state.message} />}
      {state.status === 'success' && (
        <p
          role="status"
          className="rounded-md border border-green-500 bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
        >
          {state.message ?? 'Cuenta creada.'}
        </p>
      )}

      <FormField htmlFor="name" label="Nombre de la cuenta de servicio">
        <Input
          id="name"
          name="name"
          type="text"
          placeholder="bot-de-integración"
          required
          autoComplete="off"
        />
      </FormField>

      <FormField
        htmlFor="ownerOrganizationId"
        label="ID de organización (opcional — vacío = plataforma)"
      >
        <Input
          id="ownerOrganizationId"
          name="ownerOrganizationId"
          type="text"
          placeholder="UUID de la organización"
          autoComplete="off"
        />
      </FormField>

      <Button type="submit" disabled={pending} size="md">
        {pending ? 'Creando…' : 'Crear cuenta de servicio'}
      </Button>
    </form>
  );
}

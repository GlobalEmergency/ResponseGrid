'use client';

import { useActionState, useState } from 'react';
import { grantRoleAction } from './actions';
import type { GrantActionResult, RoleView } from './actions';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Select } from '@/components/atoms/select';
import { FormField } from '@/components/molecules/form-field';
import { ErrorMessage } from '@/components/atoms/error-message';
import { GRANTABLE_SCOPE_TYPES, scopeTypeLabel } from '@/lib/permissions';

const INITIAL_STATE: GrantActionResult = { status: 'idle' };

export function GrantRoleForm({
  roles,
  defaultPrincipalId,
}: {
  roles: RoleView[];
  defaultPrincipalId?: string;
}) {
  const [state, formAction, pending] = useActionState(
    grantRoleAction,
    INITIAL_STATE,
  );
  const [scopeType, setScopeType] = useState('organization');

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.status === 'error' && <ErrorMessage message={state.message} />}
      {state.status === 'success' && (
        <p
          role="status"
          className="rounded-md border border-green-500 bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
        >
          {state.message ?? 'Rol concedido.'}
        </p>
      )}

      <FormField htmlFor="principalId" label="ID del principal (usuario o cuenta de servicio)">
        <Input
          id="principalId"
          name="principalId"
          type="text"
          placeholder="UUID"
          required
          autoComplete="off"
          defaultValue={defaultPrincipalId}
        />
      </FormField>

      <FormField htmlFor="roleId" label="Rol">
        <Select id="roleId" name="roleId" required defaultValue="">
          <option value="" disabled>
            Elige un rol…
          </option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.id} — {r.description}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField htmlFor="scopeType" label="Ámbito">
        <Select
          id="scopeType"
          name="scopeType"
          value={scopeType}
          onChange={(e) => setScopeType(e.target.value)}
        >
          {GRANTABLE_SCOPE_TYPES.map((s) => (
            <option key={s} value={s}>
              {scopeTypeLabel(s)}
            </option>
          ))}
        </Select>
      </FormField>

      {scopeType !== 'platform' && (
        <FormField htmlFor="scopeId" label={`ID de ${scopeTypeLabel(scopeType)}`}>
          <Input
            id="scopeId"
            name="scopeId"
            type="text"
            placeholder="UUID"
            required={scopeType !== 'platform'}
            autoComplete="off"
          />
        </FormField>
      )}

      <FormField htmlFor="expiresAt" label="Caduca (opcional)">
        <Input id="expiresAt" name="expiresAt" type="date" autoComplete="off" />
      </FormField>

      <Button type="submit" disabled={pending} size="md">
        {pending ? 'Concediendo…' : 'Conceder rol'}
      </Button>
    </form>
  );
}

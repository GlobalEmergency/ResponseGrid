'use client';

import { useActionState } from 'react';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Select } from '@/components/atoms/select';
import { FormField } from '@/components/molecules/form-field';
import { ErrorMessage } from '@/components/atoms/error-message';
import {
  grantRoleAction,
  type ActionResult,
  type RoleView,
  type ScopeType,
} from './actions';

const INITIAL: ActionResult = { status: 'idle' };

export function GrantRoleForm({
  scopeType,
  scopeId,
  roles,
}: {
  scopeType: ScopeType;
  scopeId: string;
  roles: RoleView[];
}) {
  const [state, formAction, pending] = useActionState(grantRoleAction, INITIAL);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="scopeType" value={scopeType} />
      <input type="hidden" name="scopeId" value={scopeId} />

      {state.status === 'error' && <ErrorMessage message={state.message} />}
      {state.status === 'success' && (
        <p
          role="status"
          className="rounded-md border border-green-500 bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
        >
          {state.message ?? 'Rol concedido.'}
        </p>
      )}

      <FormField htmlFor="principal" label="Usuario (email o ID)">
        <Input
          id="principal"
          name="principal"
          type="text"
          placeholder="persona@ejemplo.org o UUID"
          required
          autoComplete="off"
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

      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-300 rounded px-3 py-2">
        Solo puedes conceder roles cuyos permisos tú ya tengas en este ámbito
        (atenuación). El servidor lo verifica.
      </p>

      <Button type="submit" size="md" disabled={pending}>
        {pending ? 'Concediendo…' : 'Conceder rol'}
      </Button>
    </form>
  );
}

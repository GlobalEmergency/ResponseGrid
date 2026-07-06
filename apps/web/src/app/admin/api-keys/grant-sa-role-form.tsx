'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { grantServiceAccountRoleAction } from './actions';
import type { ApiKeyActionResult, RoleView } from './actions';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Select } from '@/components/atoms/select';
import { FormField } from '@/components/molecules/form-field';
import { ErrorMessage } from '@/components/atoms/error-message';
import { GRANTABLE_SCOPE_TYPES, scopeTypeLabel } from '@/lib/permissions';

const INITIAL_STATE: ApiKeyActionResult = { status: 'idle' };

/**
 * Grant a role to the service account behind an API key. The principal is fixed
 * to the service account, so the admin never copies a UUID by hand — this is the
 * write side of "edit what this key can do" (grants are create/delete-only, so
 * "editing" a permission means revoke + grant).
 */
export function GrantServiceAccountRoleForm({
  serviceAccountId,
  roles,
}: {
  serviceAccountId: string;
  roles: RoleView[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const action = grantServiceAccountRoleAction.bind(null, serviceAccountId);
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  const [scopeType, setScopeType] = useState('organization');

  // The grants list + effective permissions are server-rendered; force a refetch
  // of the RSC once a grant lands so they reflect the new permission immediately,
  // and clear the fields so a second click can't resubmit the same grant.
  useEffect(() => {
    if (state.status === 'success') {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      {state.status === 'error' && <ErrorMessage message={state.message} />}
      {state.status === 'success' && (
        <p
          role="status"
          className="rounded-md border border-green-500 bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
        >
          {state.message ?? 'Permiso concedido.'}
        </p>
      )}

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

      <FormField htmlFor="grant-expiresAt" label="Caduca (opcional)">
        <Input
          id="grant-expiresAt"
          name="expiresAt"
          type="date"
          autoComplete="off"
        />
      </FormField>

      <Button type="submit" disabled={pending} size="md">
        {pending ? 'Concediendo…' : 'Conceder permiso'}
      </Button>
    </form>
  );
}

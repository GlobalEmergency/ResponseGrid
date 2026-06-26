'use client';

import { useActionState } from 'react';
import { addMemberAction, type OrgActionResult } from '../actions';
import { Input } from '@/components/atoms/input';
import { Button } from '@/components/atoms/button';
import { ErrorMessage } from '@/components/atoms/error-message';

const INITIAL_STATE: OrgActionResult = { status: 'idle' };

interface AddMemberFormProps {
  orgId: string;
}

export function AddMemberForm({ orgId }: AddMemberFormProps) {
  const boundAction = addMemberAction.bind(null, orgId);
  const [state, formAction, pending] = useActionState<OrgActionResult, FormData>(
    boundAction,
    INITIAL_STATE,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-lg border-2 border-gray-200 p-5">
      {state.status === 'error' && (
        <ErrorMessage message={state.message ?? 'Error al añadir el miembro'} />
      )}

      {/* Success */}
      {state.status === 'success' && (
        <p
          role="status"
          aria-live="polite"
          className="rounded-md border border-green-600 bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
        >
          Miembro añadido correctamente.
        </p>
      )}

      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="add-member-email" className="sr-only">
            Email del usuario a añadir
          </label>
          <Input
            id="add-member-email"
            name="email"
            type="email"
            required
            placeholder="usuario@ejemplo.com"
          />
        </div>
        <Button
          type="submit"
          disabled={pending}
          size="md"
          className="shrink-0"
        >
          {pending ? 'Añadiendo…' : 'Añadir'}
        </Button>
      </div>
    </form>
  );
}

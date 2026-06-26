'use client';

import { useActionState } from 'react';
import { addMemberAction, type OrgActionResult } from '../actions';

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
      {/* Error */}
      {state.status === 'error' && (
        <p
          role="alert"
          aria-live="assertive"
          className="rounded-md border border-red-600 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
        >
          {state.message}
        </p>
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
          <input
            id="add-member-email"
            name="email"
            type="email"
            required
            placeholder="usuario@ejemplo.com"
            className="w-full rounded-lg border-2 border-gray-900 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? 'Añadiendo…' : 'Añadir'}
        </button>
      </div>
    </form>
  );
}

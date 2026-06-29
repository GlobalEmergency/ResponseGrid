'use client';

import { useActionState } from 'react';
import { addMemberByEmailAction } from '../actions';
import type { GroupActionResult } from '../actions';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { FormField } from '@/components/molecules/form-field';
import { ErrorMessage } from '@/components/atoms/error-message';

const INITIAL_STATE: GroupActionResult = { status: 'idle' };

export function AddMemberForm({ groupId }: { groupId: string }) {
  const [state, formAction, pending] = useActionState(
    addMemberByEmailAction,
    INITIAL_STATE,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="groupId" value={groupId} />
      {state.status === 'error' && <ErrorMessage message={state.message} />}
      {state.status === 'success' && (
        <p
          role="status"
          className="rounded-md border border-green-500 bg-green-50 px-4 py-2 text-sm font-medium text-green-800"
        >
          {state.message ?? 'Miembro añadido.'}
        </p>
      )}
      <FormField htmlFor="email" label="Añadir miembro por email">
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="persona@ejemplo.com"
          required
          autoComplete="off"
        />
      </FormField>
      <Button type="submit" disabled={pending} size="sm">
        {pending ? 'Añadiendo…' : 'Añadir miembro'}
      </Button>
    </form>
  );
}

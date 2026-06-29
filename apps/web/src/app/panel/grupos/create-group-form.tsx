'use client';

import { useActionState, useState } from 'react';
import { createGroupAction } from './actions';
import type { GroupActionResult } from './actions';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Select } from '@/components/atoms/select';
import { FormField } from '@/components/molecules/form-field';
import { ErrorMessage } from '@/components/atoms/error-message';

const INITIAL_STATE: GroupActionResult = { status: 'idle' };

export function CreateGroupForm() {
  const [state, formAction, pending] = useActionState(
    createGroupAction,
    INITIAL_STATE,
  );
  const [ownerKind, setOwnerKind] = useState<'organization' | 'emergency'>(
    'organization',
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.status === 'error' && <ErrorMessage message={state.message} />}
      {state.status === 'success' && (
        <p
          role="status"
          className="rounded-md border border-green-500 bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
        >
          {state.message ?? 'Grupo creado.'}
        </p>
      )}

      <FormField htmlFor="name" label="Nombre del grupo">
        <Input
          id="name"
          name="name"
          type="text"
          placeholder="Cuadrilla Centro"
          required
          autoComplete="off"
        />
      </FormField>

      <FormField htmlFor="visibility" label="Visibilidad">
        <Select id="visibility" name="visibility" defaultValue="private">
          <option value="private">Privado (solo se añade por el manager)</option>
          <option value="public">Público (cualquiera puede solicitar unirse)</option>
        </Select>
      </FormField>

      <FormField htmlFor="ownerKind" label="El grupo pertenece a…">
        <Select
          id="ownerKind"
          name="ownerKind"
          value={ownerKind}
          onChange={(e) =>
            setOwnerKind(e.target.value as 'organization' | 'emergency')
          }
        >
          <option value="organization">Una organización</option>
          <option value="emergency">Una emergencia</option>
        </Select>
      </FormField>

      <FormField
        htmlFor="ownerId"
        label={
          ownerKind === 'organization'
            ? 'ID de la organización'
            : 'ID de la emergencia'
        }
      >
        <Input
          id="ownerId"
          name="ownerId"
          type="text"
          placeholder="UUID"
          required
          autoComplete="off"
        />
      </FormField>

      <Button type="submit" disabled={pending} size="md">
        {pending ? 'Creando…' : 'Crear grupo'}
      </Button>
    </form>
  );
}

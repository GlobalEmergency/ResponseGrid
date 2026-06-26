'use client';

import { useActionState } from 'react';
import { updateResourceStatus } from './actions';
import type { PublicStatus, ActionResult } from './actions';
import { StatusLight } from '@/components/atoms/status-light';
import { Select } from '@/components/atoms/select';
import { Button } from '@/components/atoms/button';
import { ErrorMessage } from '@/components/atoms/error-message';
import { FormField } from '@/components/molecules/form-field';

const STATUS_OPTIONS: { value: PublicStatus; label: string }[] = [
  { value: 'active', label: 'Operativo' },
  { value: 'saturated', label: 'Saturado' },
  { value: 'paused', label: 'En pausa' },
  { value: 'closed', label: 'Cerrado' },
];

interface StatusFormProps {
  resourceId: string;
  currentStatus: PublicStatus;
  slug: string;
}

const INITIAL_STATE: ActionResult = { status: 'idle' };

export function StatusForm({ resourceId, currentStatus, slug }: StatusFormProps) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    async (_prev, formData) => {
      const rawStatus = formData.get('status');
      if (typeof rawStatus !== 'string') {
        return { status: 'error', message: 'Estado no válido.' };
      }
      return updateResourceStatus(resourceId, rawStatus as PublicStatus, slug);
    },
    INITIAL_STATE,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 font-medium">Actual:</span>
        <StatusLight status={currentStatus} />
      </div>

      <FormField htmlFor={`status-${resourceId}`} label="Cambiar estado">
        <Select
          id={`status-${resourceId}`}
          name="status"
          defaultValue={currentStatus}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </FormField>

      {state.status === 'error' && (
        <ErrorMessage message={state.message ?? 'Error desconocido'} />
      )}

      {state.status === 'success' && (
        <p className="text-xs text-green-700 font-medium">Estado actualizado correctamente.</p>
      )}

      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? 'Guardando…' : 'Guardar estado'}
      </Button>
    </form>
  );
}

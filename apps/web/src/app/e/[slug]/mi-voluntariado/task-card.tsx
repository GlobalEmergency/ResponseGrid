'use client';

import { useActionState } from 'react';
import type { components } from '@reliefhub/api-client';
import { checkInTask, checkOutTask } from './actions';
import type { CheckActionResult } from './actions';
import { Button } from '@/components/atoms/button';
import { Badge } from '@/components/atoms/badge';
import { ErrorMessage } from '@/components/atoms/error-message';

type MyTask = components['schemas']['MyTaskViewDto'];

const SKILL_LABELS: Record<string, string> = {
  driving: 'Conducción',
  medical: 'Sanitario',
  logistics: 'Logística',
  cooking: 'Cocina',
  languages: 'Idiomas',
  admin: 'Administración',
  general: 'General',
};

const TASK_STATUS_LABELS: Record<string, string> = {
  open: 'Abierta',
  in_progress: 'En progreso',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

const ASSIGNMENT_STATUS_LABELS: Record<string, string> = {
  assigned: 'Asignado',
  checked_in: 'En curso',
  checked_out: 'Finalizado',
};

const INITIAL_STATE: CheckActionResult = { status: 'idle' };

interface TaskCardProps {
  task: MyTask;
  volunteerId: string;
  slug: string;
}

export function TaskCard({ task, volunteerId, slug }: TaskCardProps) {
  const [checkInState, checkInAction, checkInPending] = useActionState<CheckActionResult, FormData>(
    async (_prev, _formData) => checkInTask(task.id, volunteerId, slug),
    INITIAL_STATE,
  );

  const [checkOutState, checkOutAction, checkOutPending] = useActionState<CheckActionResult, FormData>(
    async (_prev, _formData) => checkOutTask(task.id, volunteerId, slug),
    INITIAL_STATE,
  );

  const myStatus = task.myAssignmentStatus;
  const isPending = checkInPending || checkOutPending;

  const errorMessage =
    checkInState.status === 'error'
      ? checkInState.message
      : checkOutState.status === 'error'
        ? checkOutState.message
        : null;

  return (
    <article
      aria-label={`Tarea: ${task.title}`}
      className="flex flex-col gap-4 rounded-lg border-2 border-gray-900 bg-white p-5"
    >
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-bold text-gray-900 leading-tight flex-1">
            {task.title}
          </h3>
          <AssignmentBadge status={myStatus} />
        </div>
        {task.description !== '' && (
          <p className="text-sm text-gray-600">{task.description}</p>
        )}
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        <span>
          Estado de la tarea:{' '}
          <span className="font-semibold text-gray-700">
            {TASK_STATUS_LABELS[task.status] ?? task.status}
          </span>
        </span>
        {task.requiredSkill !== undefined && (
          <span>
            Habilidad requerida:{' '}
            <span className="font-semibold text-gray-700">
              {SKILL_LABELS[task.requiredSkill] ?? task.requiredSkill}
            </span>
          </span>
        )}
        {task.location !== undefined && (
          <span>
            Lugar:{' '}
            <span className="font-semibold text-gray-700">{task.location.address}</span>
          </span>
        )}
      </div>

      {/* Errors */}
      {errorMessage !== null && (
        <ErrorMessage message={errorMessage} />
      )}

      {/* Success feedback */}
      {(checkInState.status === 'success' || checkOutState.status === 'success') && (
        <p role="alert" aria-live="polite" className="text-xs text-green-700 font-medium">
          Actualizado correctamente.
        </p>
      )}

      {/* Check-in / Check-out buttons */}
      {myStatus === 'assigned' && (
        <form action={checkInAction}>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isPending}
            fullWidth
          >
            {checkInPending ? 'Procesando…' : 'Check-in — Empezar tarea'}
          </Button>
        </form>
      )}

      {myStatus === 'checked_in' && (
        <form action={checkOutAction}>
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            disabled={isPending}
            fullWidth
          >
            {checkOutPending ? 'Procesando…' : 'Check-out — Marcar como terminada'}
          </Button>
        </form>
      )}

      {myStatus === 'checked_out' && (
        <p className="text-sm font-semibold text-green-800 rounded-lg border border-green-300 bg-green-50 px-4 py-2">
          Tarea completada. ¡Gracias por tu colaboración!
        </p>
      )}
    </article>
  );
}

function AssignmentBadge({ status }: { status: string }) {
  const label = ASSIGNMENT_STATUS_LABELS[status] ?? status;

  if (status === 'assigned') {
    return (
      <Badge variant="unverified" aria-label={`Estado de asignación: ${label}`}>
        {label}
      </Badge>
    );
  }

  if (status === 'checked_in') {
    return (
      <span
        aria-label={`Estado de asignación: ${label}`}
        className="inline-flex items-center rounded-full border border-green-400 bg-green-50 px-3 py-1 text-sm font-semibold text-green-800 flex-shrink-0"
      >
        {label}
      </span>
    );
  }

  if (status === 'checked_out') {
    return (
      <span
        aria-label={`Estado de asignación: ${label}`}
        className="inline-flex items-center rounded-full border border-gray-300 bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-500 flex-shrink-0"
      >
        {label}
      </span>
    );
  }

  return null;
}

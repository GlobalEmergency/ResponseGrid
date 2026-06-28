'use client';

import { useActionState } from 'react';
import type { components } from '@reliefhub/api-client';
import { updateVolunteerStatus } from '@/app/e/[slug]/coordinacion/voluntarios/actions';
import type { ActionResult } from '@/app/e/[slug]/coordinacion/voluntarios/actions';
import { Badge } from '@/components/atoms/badge';
import { ErrorMessage } from '@/components/atoms/error-message';

type VolunteerViewDto = components['schemas']['VolunteerViewDto'];
type VolunteerStatus = VolunteerViewDto['status'];

const SKILL_LABELS: Record<VolunteerViewDto['skills'][number], string> = {
  driving: 'Conducción',
  medical: 'Sanitario',
  logistics: 'Logística',
  cooking: 'Cocina',
  languages: 'Idiomas',
  admin: 'Administración',
  general: 'General',
};

const AVAILABILITY_LABELS: Record<VolunteerViewDto['availability'], string> = {
  immediate: 'Inmediata',
  this_week: 'Esta semana',
  flexible: 'Flexible',
};

const VEHICLE_LABELS: Record<VolunteerViewDto['vehicle'], string> = {
  none: 'Sin vehículo',
  car: 'Coche',
  van: 'Furgoneta',
  truck: 'Camión',
};

const STATUS_LABELS: Record<VolunteerStatus, string> = {
  available: 'Disponible',
  assigned: 'Asignado',
  inactive: 'Inactivo',
};

const STATUS_BADGE_CLASSES: Record<VolunteerStatus, string> = {
  available:
    'inline-flex items-center rounded-full border border-green-400 bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-800',
  assigned:
    'inline-flex items-center rounded-full border border-amber-400 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800',
  inactive:
    'inline-flex items-center rounded-full border border-line bg-surface-alt px-2.5 py-0.5 text-xs font-semibold text-muted',
};

const INITIAL_STATE: ActionResult = { status: 'idle' };

const STATUS_OPTIONS: { value: VolunteerStatus; label: string }[] = [
  { value: 'available', label: 'Disponible' },
  { value: 'assigned', label: 'Asignado' },
  { value: 'inactive', label: 'Inactivo' },
];

interface VolunteerCardProps {
  volunteer: VolunteerViewDto;
  slug: string;
}

export function VolunteerCard({ volunteer, slug }: VolunteerCardProps) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    async (_prev, formData) => {
      const status = formData.get('status') as VolunteerStatus | null;
      if (status === null || !['available', 'assigned', 'inactive'].includes(status)) {
        return { status: 'error', message: 'Estado no válido.' };
      }
      return updateVolunteerStatus(volunteer.id, status, slug);
    },
    INITIAL_STATE,
  );

  return (
    <article
      aria-label={`Voluntario: ${volunteer.name}`}
      className="flex flex-col gap-3 rounded-lg border-2 border-line bg-white p-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-base font-bold text-ink leading-tight">{volunteer.name}</h3>
          <p className="text-sm text-muted">{volunteer.municipality}</p>
        </div>
        <span className={STATUS_BADGE_CLASSES[volunteer.status]}>
          {STATUS_LABELS[volunteer.status]}
        </span>
      </div>

      {/* Skills */}
      {volunteer.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Habilidades">
          {volunteer.skills.map((skill) => (
            <Badge key={skill} variant="role-member">
              {SKILL_LABELS[skill]}
            </Badge>
          ))}
        </div>
      )}

      {/* Meta row */}
      <div className="flex flex-wrap gap-3 text-xs text-muted">
        <span>
          <span className="font-medium">Disponibilidad:</span>{' '}
          {AVAILABILITY_LABELS[volunteer.availability]}
        </span>
        <span aria-hidden="true" className="text-muted-soft">·</span>
        <span>
          <span className="font-medium">Vehículo:</span>{' '}
          {VEHICLE_LABELS[volunteer.vehicle]}
        </span>
      </div>

      {/* Error */}
      {state.status === 'error' && <ErrorMessage message={state.message} />}

      {/* Status change form */}
      <form action={formAction} className="flex items-center gap-2 flex-wrap">
        <label htmlFor={`status-${volunteer.id}`} className="text-xs font-semibold text-ink-soft uppercase tracking-wide">
          Cambiar estado:
        </label>
        <select
          id={`status-${volunteer.id}`}
          name="status"
          defaultValue={volunteer.status}
          className="flex-1 min-w-[140px] rounded-lg border-2 border-line bg-white px-3 py-1.5 text-sm text-ink focus:border-navy focus:outline-none"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border-2 border-navy bg-navy px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? 'Guardando…' : 'Guardar'}
        </button>
      </form>
    </article>
  );
}

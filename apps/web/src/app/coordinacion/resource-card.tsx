'use client';

import { useActionState } from 'react';
import { verifyAndPublish } from './actions';
import type { components } from '@reliefhub/api-client';
import type { ActionResult } from './actions';

type ResourceView = components['schemas']['ResourceViewDto'];
type VerificationLevel = Exclude<
  components['schemas']['VerifyResourceDto']['level'],
  'unverified'
>;

const TYPE_LABELS: Record<ResourceView['type'], string> = {
  collection_point: 'Punto de recogida',
  delivery_point: 'Punto de entrega',
  warehouse: 'Almacén',
  transport: 'Transporte',
  supplier: 'Proveedor',
  venue: 'Local / Espacio',
};

const SIDE_LABELS: Record<ResourceView['side'], string> = {
  origin: 'Origen',
  destination: 'Destino',
};

const LEVEL_OPTIONS: { value: VerificationLevel; label: string }[] = [
  { value: 'verified', label: 'Verificado' },
  { value: 'official', label: 'Oficial' },
];

const INITIAL_STATE: ActionResult = { status: 'idle' };

interface ResourceCardProps {
  resource: ResourceView;
}

export function ResourceCard({ resource }: ResourceCardProps) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    async (_prev, formData) => {
      const level = formData.get('level') as VerificationLevel;
      return verifyAndPublish(resource.id, level);
    },
    INITIAL_STATE,
  );

  // After success the parent page revalidates and removes this card from the
  // list via server-side revalidation. We show nothing (card is gone).
  // But if somehow it lingers, show nothing either.
  if (state.status === 'success') {
    return null;
  }

  return (
    <article
      aria-label={`Recurso: ${resource.name}`}
      className="flex flex-col gap-4 rounded-lg border-2 border-gray-900 bg-white p-5"
    >
      {/* Header row */}
      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold text-gray-900 leading-tight break-words">
            {resource.name}
          </h2>
          {/* Unverified badge */}
          <span
            aria-label="Sin verificar"
            className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-full border border-blue-300 bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-800"
          >
            <span aria-hidden="true" className="text-base">
              🔵
            </span>
            Sin verificar
          </span>
        </div>

        {/* Type + side */}
        <div className="flex flex-wrap gap-3 text-sm text-gray-600">
          <span className="font-medium">{TYPE_LABELS[resource.type]}</span>
          <span aria-hidden="true" className="text-gray-300">
            ·
          </span>
          <span>{SIDE_LABELS[resource.side]}</span>
        </div>
      </div>

      {/* Error message */}
      {state.status === 'error' && (
        <p
          role="alert"
          aria-live="assertive"
          className="rounded-md border border-red-600 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
        >
          {state.message}
        </p>
      )}

      {/* Action form */}
      <form action={formAction} className="flex flex-col gap-3">
        {/* Level selector */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={`level-${resource.id}`}
            className="text-xs font-semibold uppercase tracking-wide text-gray-700"
          >
            Nivel de verificación
          </label>
          <select
            id={`level-${resource.id}`}
            name="level"
            defaultValue="verified"
            className="w-full rounded-lg border-2 border-gray-900 bg-white px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
          >
            {LEVEL_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={pending}
          className="flex w-full items-center justify-center rounded-lg bg-gray-900 px-6 py-4 text-lg font-semibold text-white transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? 'Procesando…' : 'Verificar y publicar'}
        </button>
      </form>
    </article>
  );
}

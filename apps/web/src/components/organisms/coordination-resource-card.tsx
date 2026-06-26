'use client';

import { useActionState } from 'react';
import { verifyAndPublish } from '@/app/e/[slug]/coordinacion/actions';
import type { components } from '@reliefhub/api-client';
import type { ActionResult } from '@/app/e/[slug]/coordinacion/actions';
import { Badge } from '@/components/atoms/badge';
import { Select } from '@/components/atoms/select';
import { Button } from '@/components/atoms/button';
import { ErrorMessage } from '@/components/atoms/error-message';

type ResourceView = components['schemas']['ResourceViewDto'];
type VerificationLevel = Exclude<
  components['schemas']['VerifyResourceDto']['level'],
  'unverified'
>;

const TYPE_LABELS: Record<ResourceView['type'], string> = {
  collection_point: 'Punto de recogida',
  delivery_point: 'Punto de entrega',
  collection_and_delivery: 'Recogida y entrega',
  warehouse: 'Almacén',
  transport: 'Transporte',
  supplier: 'Proveedor',
  venue: 'Local / Espacio',
};

const STAGE_LABELS: Record<ResourceView['stage'], string> = {
  origin: 'Origen',
  intermediate: 'Intermedio',
  destination: 'Destino',
};

const LEVEL_OPTIONS: { value: VerificationLevel; label: string }[] = [
  { value: 'verified', label: 'Verificado' },
  { value: 'official', label: 'Oficial' },
];

const INITIAL_STATE: ActionResult = { status: 'idle' };

interface CoordinationResourceCardProps {
  resource: ResourceView;
  slug: string;
}

export function CoordinationResourceCard({
  resource,
  slug,
}: CoordinationResourceCardProps) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    async (_prev, formData) => {
      const level = formData.get('level') as VerificationLevel;
      return verifyAndPublish(resource.id, slug, level);
    },
    INITIAL_STATE,
  );

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
          <Badge variant="unverified" aria-label="Sin verificar">
            Sin verificar
          </Badge>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-gray-600">
          <span className="font-medium">{TYPE_LABELS[resource.type]}</span>
          <span aria-hidden="true" className="text-gray-300">·</span>
          <span>{STAGE_LABELS[resource.stage]}</span>
        </div>
      </div>

      {/* Error message */}
      {state.status === 'error' && (
        <ErrorMessage message={state.message ?? 'Error desconocido'} />
      )}

      {/* Action form */}
      <form action={formAction} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={`level-${resource.id}`}
            className="text-xs font-semibold uppercase tracking-wide text-gray-700"
          >
            Nivel de verificación
          </label>
          <Select
            id={`level-${resource.id}`}
            name="level"
            defaultValue="verified"
          >
            {LEVEL_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        <Button type="submit" disabled={pending} fullWidth>
          {pending ? 'Procesando…' : 'Verificar y publicar'}
        </Button>
      </form>
    </article>
  );
}

'use client';

import { useActionState } from 'react';
import { verifyAndPublish } from '@/app/e/[slug]/coordinacion/actions';
import type { components } from '@reliefhub/api-client';
import type { ActionResult } from '@/app/e/[slug]/coordinacion/actions';
import { VerificationBadge } from '@/components/atoms/verification-badge';
import { Button } from '@/components/atoms/button';
import { ErrorMessage } from '@/components/atoms/error-message';

type ResourceView = components['schemas']['ResourceViewDto'];

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
    (_prev, _formData) => verifyAndPublish(resource.id, slug),
    INITIAL_STATE,
  );

  if (state.status === 'success') {
    return null;
  }

  return (
    <article
      aria-label={`Recurso: ${resource.name}`}
      className="flex flex-col gap-4 rounded-lg border-2 border-navy bg-white p-5"
    >
      {/* Header row */}
      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold text-ink leading-tight break-words">
            {resource.name}
          </h2>
          <VerificationBadge level={resource.verificationLevel} />
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-muted">
          <span className="font-medium">{TYPE_LABELS[resource.type]}</span>
          <span aria-hidden="true" className="text-muted-soft">·</span>
          <span>{STAGE_LABELS[resource.stage]}</span>
        </div>
      </div>

      {/* Error message */}
      {state.status === 'error' && (
        <ErrorMessage message={state.message ?? 'Error desconocido'} />
      )}

      {/* Action form — no level selection; backend derives the level */}
      <form action={formAction}>
        <Button type="submit" disabled={pending} fullWidth>
          {pending ? 'Procesando…' : 'Verificar y publicar'}
        </Button>
      </form>
    </article>
  );
}

'use client';

import { useActionState } from 'react';
import { verifyAndPublish } from '@/app/e/[slug]/coordinacion/actions';
import type { components } from '@reliefhub/api-client';
import type { ActionResult } from '@/app/e/[slug]/coordinacion/actions';
import { VerificationBadge } from '@/components/atoms/verification-badge';
import { Button } from '@/components/atoms/button';
import { ErrorMessage } from '@/components/atoms/error-message';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';

type ResourceView = components['schemas']['ResourceViewDto'];

const INITIAL_STATE: ActionResult = { status: 'idle' };

interface CoordinationResourceCardProps {
  resource: ResourceView;
  slug: string;
}

export function CoordinationResourceCard({
  resource,
  slug,
}: CoordinationResourceCardProps) {
  const tc = getMessages(useLocale()).coord;

  const TYPE_LABELS: Record<ResourceView['type'], string> = {
    collection_point: tc.resource_type_collection_point,
    delivery_point: tc.resource_type_delivery_point,
    collection_and_delivery: tc.resource_type_collection_and_delivery,
    warehouse: tc.resource_type_warehouse,
    transport: tc.resource_type_transport,
    supplier: tc.resource_type_supplier,
    venue: tc.resource_type_venue,
  };

  const STAGE_LABELS: Record<ResourceView['stage'], string> = {
    origin: tc.resource_stage_origin,
    intermediate: tc.resource_stage_intermediate,
    destination: tc.resource_stage_destination,
  };

  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    (_prev, _formData) => verifyAndPublish(resource.id, slug),
    INITIAL_STATE,
  );

  if (state.status === 'success') {
    return null;
  }

  return (
    <article
      aria-label={tc.resource_card_label.replace('{name}', resource.name)}
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
        <ErrorMessage message={state.message ?? tc.error_unknown} />
      )}

      {/* Action form — no level selection; backend derives the level */}
      <form action={formAction}>
        <Button type="submit" disabled={pending} fullWidth>
          {pending ? tc.processing : tc.resource_verify_publish}
        </Button>
      </form>
    </article>
  );
}

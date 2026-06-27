import type { components } from '@reliefhub/api-client';
import { VerificationBadge } from '@/components/atoms/verification-badge';
import { StatusLight } from '@/components/atoms/status-light';
import type { Messages } from '@/i18n/messages/es';

type ResourceViewDto = components['schemas']['ResourceViewDto'];

interface PublicResourceCardProps {
  resource: ResourceViewDto;
  t: Messages['resource_card'];
  tVerification: Messages['verification_badge'];
  tStatusLight: Messages['status_light'];
}

/**
 * PublicResourceCard — a verified logistics point (Banda oficial look):
 * trust + operational pills on top, name, then type · stage.
 */
export function PublicResourceCard({ resource, t, tVerification, tStatusLight }: PublicResourceCardProps) {
  const typeLabels: Record<ResourceViewDto['type'], string> = {
    collection_point: t.type_collection_point,
    delivery_point: t.type_delivery_point,
    collection_and_delivery: t.type_collection_and_delivery,
    warehouse: t.type_warehouse,
    transport: t.type_transport,
    supplier: t.type_supplier,
    venue: t.type_venue,
  };

  const stageLabels: Record<ResourceViewDto['stage'], string> = {
    origin: t.stage_origin,
    intermediate: t.stage_intermediate,
    destination: t.stage_destination,
  };

  return (
    <article
      aria-label={`${resource.name}`}
      className="flex flex-col gap-1.5 rounded-card border border-line bg-white p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <VerificationBadge level={resource.verificationLevel} t={tVerification} />
        <StatusLight status={resource.publicStatus} t={tStatusLight} />
      </div>
      <h3 className="text-[15px] font-bold leading-tight text-ink">
        {resource.name}
      </h3>
      <p className="text-[12.5px] text-muted">
        {typeLabels[resource.type]} · {stageLabels[resource.stage]}
      </p>
    </article>
  );
}

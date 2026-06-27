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
      aria-label={`Punto activo: ${resource.name}`}
      className="flex flex-col gap-2 rounded-lg border-2 border-gray-900 bg-white p-4"
    >
      <h3 className="text-lg font-bold text-gray-900 leading-tight">
        {resource.name}
      </h3>
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
        <span className="font-medium">{typeLabels[resource.type]}</span>
        <span aria-hidden="true" className="text-gray-300">·</span>
        <span>{stageLabels[resource.stage]}</span>
        <span aria-hidden="true" className="text-gray-300">·</span>
        <VerificationBadge level={resource.verificationLevel} t={tVerification} />
        <span aria-hidden="true" className="text-gray-300">·</span>
        <StatusLight status={resource.publicStatus} t={tStatusLight} />
      </div>
    </article>
  );
}

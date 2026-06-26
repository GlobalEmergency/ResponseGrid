import type { components } from '@reliefhub/api-client';
import { VerificationBadge } from '@/components/atoms/verification-badge';
import { StatusLight } from '@/components/atoms/status-light';

type ResourceViewDto = components['schemas']['ResourceViewDto'];

const TYPE_LABELS: Record<ResourceViewDto['type'], string> = {
  collection_point: 'Punto de recogida',
  delivery_point: 'Punto de entrega',
  collection_and_delivery: 'Recogida y entrega',
  warehouse: 'Almacén',
  transport: 'Transporte',
  supplier: 'Proveedor',
  venue: 'Local / Espacio',
};

const STAGE_LABELS: Record<ResourceViewDto['stage'], string> = {
  origin: 'Origen',
  intermediate: 'Intermedio',
  destination: 'Destino',
};

interface PublicResourceCardProps {
  resource: ResourceViewDto;
}

export function PublicResourceCard({ resource }: PublicResourceCardProps) {
  return (
    <article
      aria-label={`Punto activo: ${resource.name}`}
      className="flex flex-col gap-2 rounded-lg border-2 border-gray-900 bg-white p-4"
    >
      <h3 className="text-lg font-bold text-gray-900 leading-tight">
        {resource.name}
      </h3>
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
        <span className="font-medium">{TYPE_LABELS[resource.type]}</span>
        <span aria-hidden="true" className="text-gray-300">·</span>
        <span>{STAGE_LABELS[resource.stage]}</span>
        <span aria-hidden="true" className="text-gray-300">·</span>
        <VerificationBadge level={resource.verificationLevel} />
        <span aria-hidden="true" className="text-gray-300">·</span>
        <StatusLight status={resource.publicStatus} />
      </div>
    </article>
  );
}

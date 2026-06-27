'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const ENTITY_TYPE_OPTIONS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'resource', label: 'Recurso' },
  { value: 'need', label: 'Necesidad' },
  { value: 'emergency', label: 'Emergencia' },
  { value: 'offer', label: 'Oferta' },
  { value: 'report', label: 'Reporte' },
  { value: 'volunteer', label: 'Voluntario' },
  { value: 'organization', label: 'Organización' },
  { value: 'accreditation', label: 'Acreditación' },
  { value: 'template', label: 'Plantilla' },
] as const;

const selectClass =
  'rounded-lg border-2 border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none';

/**
 * AuditFilter — client component that drives `entityType` and
 * `emergencyId` searchParams filters for the audit log page.
 * Uses router.replace so the Server Component page re-renders with
 * updated params without a full navigation.
 */
export function AuditFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentEntityType = searchParams.get('entityType') ?? '';
  const currentEmergencyId = searchParams.get('emergencyId') ?? '';

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === '') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    // reset offset when filter changes
    params.delete('offset');
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap gap-3" role="group" aria-label="Filtros del registro de auditoría">
      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        <span>Tipo de entidad</span>
        <select
          value={currentEntityType}
          onChange={(e) => updateParam('entityType', e.target.value)}
          className={selectClass}
          aria-label="Filtrar por tipo de entidad"
        >
          {ENTITY_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        <span>ID de emergencia</span>
        <input
          type="text"
          value={currentEmergencyId}
          onChange={(e) => updateParam('emergencyId', e.target.value)}
          className={`${selectClass} min-w-[14rem]`}
          placeholder="UUID de emergencia…"
          aria-label="Filtrar por ID de emergencia"
        />
      </label>
    </div>
  );
}

'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const SKILL_OPTIONS = [
  { value: '', label: 'Todas las habilidades' },
  { value: 'driving', label: 'Conducción' },
  { value: 'medical', label: 'Sanitario' },
  { value: 'logistics', label: 'Logística' },
  { value: 'cooking', label: 'Cocina' },
  { value: 'languages', label: 'Idiomas' },
  { value: 'admin', label: 'Administración' },
  { value: 'general', label: 'General' },
] as const;

const AVAILABILITY_OPTIONS = [
  { value: '', label: 'Cualquier disponibilidad' },
  { value: 'immediate', label: 'Inmediata' },
  { value: 'this_week', label: 'Esta semana' },
  { value: 'flexible', label: 'Flexible' },
] as const;

const VEHICLE_OPTIONS = [
  { value: '', label: 'Cualquier vehículo' },
  { value: 'none', label: 'Sin vehículo' },
  { value: 'car', label: 'Coche' },
  { value: 'van', label: 'Furgoneta' },
  { value: 'truck', label: 'Camión' },
] as const;

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'available', label: 'Disponible' },
  { value: 'assigned', label: 'Asignado' },
  { value: 'inactive', label: 'Inactivo' },
] as const;

export function VolunteerRosterFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSkill = searchParams.get('skill') ?? '';
  const currentAvailability = searchParams.get('availability') ?? '';
  const currentVehicle = searchParams.get('vehicle') ?? '';
  const currentStatus = searchParams.get('vstatus') ?? '';

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === '') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  const selectClass =
    'rounded-lg border-2 border-line bg-white px-3 py-1.5 text-sm text-ink focus:border-navy focus:outline-none';

  return (
    <div className="flex flex-wrap gap-3" role="group" aria-label="Filtros del roster">
      <label className="flex flex-col gap-1 text-xs font-medium text-muted">
        <span>Habilidad</span>
        <select
          value={currentSkill}
          onChange={(e) => updateParam('skill', e.target.value)}
          className={selectClass}
          aria-label="Filtrar por habilidad"
        >
          {SKILL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-muted">
        <span>Disponibilidad</span>
        <select
          value={currentAvailability}
          onChange={(e) => updateParam('availability', e.target.value)}
          className={selectClass}
          aria-label="Filtrar por disponibilidad"
        >
          {AVAILABILITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-muted">
        <span>Vehículo</span>
        <select
          value={currentVehicle}
          onChange={(e) => updateParam('vehicle', e.target.value)}
          className={selectClass}
          aria-label="Filtrar por vehículo"
        >
          {VEHICLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-muted">
        <span>Estado</span>
        <select
          value={currentStatus}
          onChange={(e) => updateParam('vstatus', e.target.value)}
          className={selectClass}
          aria-label="Filtrar por estado"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

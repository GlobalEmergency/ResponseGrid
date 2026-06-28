import type { components } from '@reliefhub/api-client';
import { SkillTag } from '@/components/atoms/skill-tag';

type VolunteerSuggestionDto = components['schemas']['VolunteerSuggestionDto'];

const AVAILABILITY_LABELS: Record<string, string> = {
  immediate: 'Inmediata',
  this_week: 'Esta semana',
  flexible: 'Flexible',
};

interface VolunteerSuggestionCardProps {
  volunteer: VolunteerSuggestionDto;
  selected: boolean;
  onToggle: (volunteerId: string) => void;
}

export function VolunteerSuggestionCard({
  volunteer,
  selected,
  onToggle,
}: VolunteerSuggestionCardProps) {
  const availabilityLabel =
    AVAILABILITY_LABELS[volunteer.availability] ?? volunteer.availability;

  return (
    <article
      aria-label={`Voluntario sugerido: ${volunteer.name}`}
      className={`flex flex-col gap-3 rounded-lg border-2 p-4 transition-colors ${
        selected
          ? 'border-navy bg-surface'
          : 'border-line bg-white hover:border-line'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h4 className="text-base font-bold text-ink leading-tight">
            {volunteer.name}
          </h4>
          <div className="flex flex-wrap gap-3 text-xs text-muted">
            <span>
              <span className="font-medium">Disponibilidad:</span>{' '}
              {availabilityLabel}
            </span>
            {volunteer.hasVehicle && (
              <>
                <span aria-hidden="true" className="text-muted-soft">·</span>
                <span className="font-medium">Con vehículo</span>
              </>
            )}
          </div>
        </div>

        {/* Toggle button */}
        <button
          type="button"
          onClick={() => onToggle(volunteer.volunteerId)}
          aria-pressed={selected}
          aria-label={
            selected
              ? `Deseleccionar a ${volunteer.name}`
              : `Seleccionar a ${volunteer.name}`
          }
          className={`flex-shrink-0 rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 ${
            selected
              ? 'border-navy bg-navy text-white hover:bg-navy-700'
              : 'border-navy bg-white text-ink hover:bg-surface-alt'
          }`}
        >
          {selected ? 'Seleccionado' : 'Seleccionar'}
        </button>
      </div>

      {/* Skills */}
      {volunteer.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Habilidades">
          {volunteer.skills.map((skill) => (
            <SkillTag key={skill} skill={skill} />
          ))}
        </div>
      )}
    </article>
  );
}

import type { components } from '@reliefhub/api-client';
import { SkillTag } from '@/components/atoms/skill-tag';
import type { getMessages } from '@/i18n';

type VolunteerSuggestionDto = components['schemas']['VolunteerSuggestionDto'];

interface VolunteerSuggestionCardProps {
  volunteer: VolunteerSuggestionDto;
  selected: boolean;
  onToggle: (volunteerId: string) => void;
  tc: ReturnType<typeof getMessages>['coord'];
}

export function VolunteerSuggestionCard({
  volunteer,
  selected,
  onToggle,
  tc,
}: VolunteerSuggestionCardProps) {
  const AVAILABILITY_LABELS: Record<string, string> = {
    immediate: tc.availability_immediate,
    this_week: tc.availability_this_week,
    flexible: tc.availability_flexible,
  };

  const availabilityLabel =
    AVAILABILITY_LABELS[volunteer.availability] ?? volunteer.availability;

  return (
    <article
      aria-label={tc.suggestion_card_label.replace('{name}', volunteer.name)}
      className={`flex flex-col gap-3 rounded-lg border-2 p-4 transition-colors ${
        selected
          ? 'border-navy bg-surface'
          : 'border-line bg-white hover:border-line'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h4 className="text-base font-bold text-ink leading-tight">
            {volunteer.name}
          </h4>
          <div className="flex flex-wrap gap-3 text-xs text-muted">
            <span>
              <span className="font-medium">{tc.volunteer_availability_label}:</span>{' '}
              {availabilityLabel}
            </span>
            {volunteer.hasVehicle && (
              <>
                <span aria-hidden="true" className="text-muted-soft">·</span>
                <span className="font-medium">{tc.suggestion_has_vehicle}</span>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onToggle(volunteer.volunteerId)}
          aria-pressed={selected}
          aria-label={
            selected
              ? tc.suggestion_deselect_label.replace('{name}', volunteer.name)
              : tc.suggestion_select_label.replace('{name}', volunteer.name)
          }
          className={`flex-shrink-0 rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 ${
            selected
              ? 'border-navy bg-navy text-white hover:bg-navy-700'
              : 'border-navy bg-white text-ink hover:bg-surface-alt'
          }`}
        >
          {selected ? tc.suggestion_selected : tc.suggestion_select}
        </button>
      </div>

      {volunteer.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label={tc.volunteer_skills_label}>
          {volunteer.skills.map((skill) => (
            <SkillTag key={skill} skill={skill} />
          ))}
        </div>
      )}
    </article>
  );
}

type SkillValue =
  | 'driving'
  | 'medical'
  | 'logistics'
  | 'cooking'
  | 'languages'
  | 'admin'
  | 'general';

const SKILL_LABELS: Record<SkillValue, string> = {
  driving: 'Conducción',
  medical: 'Sanitario',
  logistics: 'Logística',
  cooking: 'Cocina',
  languages: 'Idiomas',
  admin: 'Administración',
  general: 'General',
};

interface SkillTagProps {
  skill: string;
}

/**
 * Pastilla de skill de voluntario. Acepta cualquier string del enum VolunteerSkill.
 * Si el valor no es reconocido se muestra tal cual.
 */
export function SkillTag({ skill }: SkillTagProps) {
  const label = SKILL_LABELS[skill as SkillValue] ?? skill;
  return (
    <span className="inline-flex items-center rounded-full border border-info-line bg-info-soft px-2.5 py-0.5 text-xs font-semibold text-info">
      {label}
    </span>
  );
}

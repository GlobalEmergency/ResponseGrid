'use client';

/**
 * PersonnelNeedFields — bloque condicional que aparece en el formulario /peticion
 * cuando algún ítem tiene categoría `medical_personnel`.
 *
 * Envía tres campos hidden al server action de /peticion:
 *   - requiredSkill (enum VolunteerSkill, opcional)
 *   - skillSpecialty (texto libre, opcional)
 *   - requestedCount (número >= 1, opcional)
 */

import { useState } from 'react';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';

type SkillValue =
  | 'driving'
  | 'medical'
  | 'logistics'
  | 'cooking'
  | 'languages'
  | 'admin'
  | 'general';

export function PersonnelNeedFields() {
  const [skill, setSkill] = useState<SkillValue | ''>('medical');
  const [specialty, setSpecialty] = useState('');
  const [count, setCount] = useState(1);
  const tc = getMessages(useLocale()).coord;

  const SKILL_OPTIONS: { value: SkillValue; label: string }[] = [
    { value: 'medical', label: tc.personnel_fields_skill_medical },
    { value: 'driving', label: tc.skill_driving },
    { value: 'logistics', label: tc.skill_logistics },
    { value: 'cooking', label: tc.skill_cooking },
    { value: 'languages', label: tc.skill_languages },
    { value: 'admin', label: tc.skill_admin },
    { value: 'general', label: tc.personnel_fields_skill_general },
  ];

  return (
    <div className="flex flex-col gap-4 rounded-lg border-2 border-info-line bg-info-soft p-4">
      <p className="text-sm font-semibold text-info uppercase tracking-wide">
        {tc.personnel_fields_heading}
      </p>

      {/* Habilidad requerida */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="personnel-skill"
          className="text-sm font-medium text-ink-soft"
        >
          {tc.personnel_fields_skill_label}{' '}
          <span className="text-muted-soft font-normal">{tc.optional}</span>
        </label>
        <select
          id="personnel-skill"
          name="requiredSkill"
          value={skill}
          onChange={(e) => setSkill(e.target.value as SkillValue | '')}
          className="w-full rounded-lg border-2 border-navy bg-white px-4 py-3 text-base text-ink focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
        >
          <option value="">{tc.personnel_fields_skill_unspecified}</option>
          {SKILL_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Especialidad (texto libre) */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="personnel-specialty"
          className="text-sm font-medium text-ink-soft"
        >
          {tc.personnel_fields_specialty_label}{' '}
          <span className="text-muted-soft font-normal">{tc.optional}</span>
        </label>
        <input
          id="personnel-specialty"
          name="skillSpecialty"
          type="text"
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          placeholder={tc.personnel_fields_specialty_placeholder}
          className="w-full rounded-lg border-2 border-navy bg-white px-4 py-3 text-base text-ink placeholder:text-muted-soft focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
        />
      </div>

      {/* Personas necesarias */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="personnel-count"
          className="text-sm font-medium text-ink-soft"
        >
          {tc.personnel_fields_count_label}{' '}
          <span className="text-muted-soft font-normal">{tc.optional}</span>
        </label>
        <input
          id="personnel-count"
          name="requestedCount"
          type="number"
          min={1}
          step={1}
          value={count}
          onChange={(e) => setCount(Math.max(1, Number(e.target.value)))}
          className="w-full rounded-lg border-2 border-navy bg-white px-4 py-3 text-base text-ink focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
        />
      </div>
    </div>
  );
}

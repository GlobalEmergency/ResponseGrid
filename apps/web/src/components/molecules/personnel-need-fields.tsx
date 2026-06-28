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

type SkillValue =
  | 'driving'
  | 'medical'
  | 'logistics'
  | 'cooking'
  | 'languages'
  | 'admin'
  | 'general';

const SKILL_OPTIONS: { value: SkillValue; label: string }[] = [
  { value: 'medical', label: 'Sanitario / Primeros auxilios' },
  { value: 'driving', label: 'Conducción' },
  { value: 'logistics', label: 'Logística' },
  { value: 'cooking', label: 'Cocina' },
  { value: 'languages', label: 'Idiomas' },
  { value: 'admin', label: 'Administración' },
  { value: 'general', label: 'General / Apoyo' },
];

export function PersonnelNeedFields() {
  const [skill, setSkill] = useState<SkillValue | ''>('medical');
  const [specialty, setSpecialty] = useState('');
  const [count, setCount] = useState(1);

  return (
    <div className="flex flex-col gap-4 rounded-lg border-2 border-blue-300 bg-blue-50 p-4">
      <p className="text-sm font-semibold text-blue-900 uppercase tracking-wide">
        Personal sanitario — detalle
      </p>

      {/* Habilidad requerida */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="personnel-skill"
          className="text-sm font-medium text-ink-soft"
        >
          Habilidad requerida{' '}
          <span className="text-muted-soft font-normal">(opcional)</span>
        </label>
        <select
          id="personnel-skill"
          name="requiredSkill"
          value={skill}
          onChange={(e) => setSkill(e.target.value as SkillValue | '')}
          className="w-full rounded-lg border-2 border-navy bg-white px-4 py-3 text-base text-ink focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
        >
          <option value="">Sin especificar</option>
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
          Especialidad{' '}
          <span className="text-muted-soft font-normal">(opcional)</span>
        </label>
        <input
          id="personnel-specialty"
          name="skillSpecialty"
          type="text"
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          placeholder="Ej. médico urgencias pediátricas"
          className="w-full rounded-lg border-2 border-navy bg-white px-4 py-3 text-base text-ink placeholder:text-muted-soft focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
        />
      </div>

      {/* Personas necesarias */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="personnel-count"
          className="text-sm font-medium text-ink-soft"
        >
          Personas necesarias{' '}
          <span className="text-muted-soft font-normal">(opcional)</span>
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

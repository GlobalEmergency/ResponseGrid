'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import type { components } from '@reliefhub/api-client';
import type { VolunteerActionState } from './actions';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Select } from '@/components/atoms/select';
import { ErrorMessage } from '@/components/atoms/error-message';
import { FormField } from '@/components/molecules/form-field';

type VolunteerViewDto = components['schemas']['VolunteerViewDto'];
type Skill = components['schemas']['RegisterVolunteerDto']['skills'][number];

const INITIAL_STATE: VolunteerActionState = { status: 'idle' };

const SKILL_OPTIONS: { value: Skill; label: string }[] = [
  { value: 'driving', label: 'Conducción' },
  { value: 'medical', label: 'Sanitario / Primeros auxilios' },
  { value: 'logistics', label: 'Logística' },
  { value: 'cooking', label: 'Cocina' },
  { value: 'languages', label: 'Idiomas' },
  { value: 'admin', label: 'Administración' },
  { value: 'general', label: 'General / Apoyo' },
];

const AVAILABILITY_OPTIONS = [
  { value: 'immediate', label: 'Inmediata' },
  { value: 'this_week', label: 'Esta semana' },
  { value: 'flexible', label: 'Flexible' },
] as const;

const VEHICLE_OPTIONS = [
  { value: 'none', label: 'Ninguno' },
  { value: 'car', label: 'Coche' },
  { value: 'van', label: 'Furgoneta' },
  { value: 'truck', label: 'Camión' },
] as const;

type BoundAction = (prev: VolunteerActionState, formData: FormData) => Promise<VolunteerActionState>;

interface VoluntarioFormProps {
  action: BoundAction;
  slug: string;
  existingProfile: VolunteerViewDto | null;
}

export function VoluntarioForm({ action, slug, existingProfile }: VoluntarioFormProps) {
  const [state, formAction, pending] = useActionState<VolunteerActionState, FormData>(
    action,
    INITIAL_STATE,
  );

  const [name, setName] = useState(existingProfile?.name ?? '');
  const [contact, setContact] = useState(existingProfile?.contact ?? '');
  const [municipality, setMunicipality] = useState(existingProfile?.municipality ?? '');
  const [availability, setAvailability] = useState(existingProfile?.availability ?? '');
  const [vehicle, setVehicle] = useState(existingProfile?.vehicle ?? '');
  const [selectedSkills, setSelectedSkills] = useState<Set<Skill>>(
    new Set(existingProfile?.skills ?? []),
  );

  function toggleSkill(skill: Skill) {
    setSelectedSkills((prev) => {
      const next = new Set(prev);
      if (next.has(skill)) {
        next.delete(skill);
      } else {
        next.add(skill);
      }
      return next;
    });
  }

  if (state.status === 'success') {
    return (
      <section
        role="alert"
        aria-live="polite"
        className="flex flex-col gap-6 rounded-lg border-2 border-gray-900 bg-white p-6"
      >
        <p className="text-lg font-semibold text-gray-900 leading-snug">
          {existingProfile !== null
            ? '¡Datos actualizados! Tu perfil de voluntario ha sido guardado.'
            : '¡Gracias! Quedas registrado como voluntario. El equipo de coordinación se pondrá en contacto contigo.'}
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href={`/e/${slug}/mi-voluntariado`}
            className="flex items-center justify-center w-full py-4 px-6 text-base font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors"
          >
            Ver mi voluntariado
          </Link>
          <Link
            href={`/e/${slug}`}
            className="flex items-center justify-center w-full py-4 px-6 text-base font-semibold text-gray-900 bg-white border-2 border-gray-900 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors"
          >
            Volver a la emergencia
          </Link>
        </div>
      </section>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {existingProfile !== null && (
        <div
          className="rounded-lg border-2 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="note"
        >
          <span className="font-semibold">Ya estás apuntado como voluntario.</span>{' '}
          Puedes actualizar tus datos a continuación.
        </div>
      )}

      {state.status === 'error' && (
        <ErrorMessage message={state.message} />
      )}

      {/* Nombre */}
      <FormField
        htmlFor="name"
        label={<>Nombre completo <span aria-hidden="true">*</span></>}
      >
        <Input
          id="name"
          name="name"
          type="text"
          required
          minLength={2}
          placeholder="Ej. Ana García"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </FormField>

      {/* Contacto */}
      <FormField
        htmlFor="contact"
        label={<>Contacto (email o teléfono) <span aria-hidden="true">*</span></>}
      >
        <Input
          id="contact"
          name="contact"
          type="text"
          required
          minLength={2}
          placeholder="Ej. ana@ejemplo.com o 612 345 678"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
        />
      </FormField>

      {/* Municipio */}
      <FormField
        htmlFor="municipality"
        label={<>Municipio <span aria-hidden="true">*</span></>}
      >
        <Input
          id="municipality"
          name="municipality"
          type="text"
          required
          minLength={2}
          placeholder="Ej. Valencia"
          value={municipality}
          onChange={(e) => setMunicipality(e.target.value)}
        />
      </FormField>

      {/* Habilidades */}
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          Habilidades
        </legend>
        <div className="flex flex-wrap gap-2">
          {SKILL_OPTIONS.map(({ value, label }) => {
            const active = selectedSkills.has(value);
            return (
              <label
                key={value}
                className={[
                  'inline-flex cursor-pointer select-none items-center rounded-full border-2 px-3 py-1 text-sm font-semibold transition-colors',
                  active
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-500',
                ].join(' ')}
              >
                <input
                  type="checkbox"
                  name="skills"
                  value={value}
                  checked={active}
                  onChange={() => toggleSkill(value)}
                  className="sr-only"
                />
                {label}
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Disponibilidad */}
      <FormField
        htmlFor="availability"
        label={<>Disponibilidad <span aria-hidden="true">*</span></>}
      >
        <Select
          id="availability"
          name="availability"
          required
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
        >
          <option value="" disabled>
            Selecciona tu disponibilidad…
          </option>
          {AVAILABILITY_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </FormField>

      {/* Vehículo */}
      <FormField
        htmlFor="vehicle"
        label={<>Vehículo disponible <span aria-hidden="true">*</span></>}
      >
        <Select
          id="vehicle"
          name="vehicle"
          required
          value={vehicle}
          onChange={(e) => setVehicle(e.target.value)}
        >
          <option value="" disabled>
            Selecciona tipo de vehículo…
          </option>
          {VEHICLE_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </FormField>

      {/* Consentimiento GDPR */}
      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-3">
          <input
            id="consentAccepted"
            name="consentAccepted"
            type="checkbox"
            required
            defaultChecked={existingProfile?.consentAccepted ?? false}
            className="mt-1 h-4 w-4 flex-shrink-0 cursor-pointer rounded border-2 border-gray-900 accent-gray-900"
          />
          <label
            htmlFor="consentAccepted"
            className="text-sm text-gray-700 leading-snug cursor-pointer"
          >
            Acepto el tratamiento de mis datos personales para la coordinación de
            esta emergencia, conforme a la normativa vigente de protección de datos
            (GDPR). Los datos serán usados exclusivamente para la gestión del
            voluntariado. <span aria-hidden="true" className="text-red-600 font-bold">*</span>
          </label>
        </div>
      </div>

      <Button type="submit" disabled={pending} fullWidth>
        {pending
          ? 'Guardando…'
          : existingProfile !== null
            ? 'Actualizar datos'
            : 'Apuntarme como voluntario'}
      </Button>
    </form>
  );
}

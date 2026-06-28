'use client';

import { useActionState, useState, useEffect } from 'react';
import Link from 'next/link';
import type { components } from '@reliefhub/api-client';
import type { VolunteerActionState } from './actions';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Select } from '@/components/atoms/select';
import { ErrorMessage } from '@/components/atoms/error-message';
import { FormField } from '@/components/molecules/form-field';
import { DraftRestoredBanner } from '@/components/atoms/draft-restored-banner';
import { useFormDraft } from '@/lib/use-form-draft';
import type { Messages } from '@/i18n/messages/es';

type VolunteerViewDto = components['schemas']['VolunteerViewDto'];
type Skill = components['schemas']['RegisterVolunteerDto']['skills'][number];

const INITIAL_STATE: VolunteerActionState = { status: 'idle' };

type BoundAction = (prev: VolunteerActionState, formData: FormData) => Promise<VolunteerActionState>;

interface VoluntarioFormProps {
  action: BoundAction;
  slug: string;
  existingProfile: VolunteerViewDto | null;
  t: Messages['voluntario'];
  backToEmergencyLabel: string;
}

export function VoluntarioForm({ action, slug, existingProfile, t, backToEmergencyLabel }: VoluntarioFormProps) {
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

  // Draft only for the simple string fields (skills set is non-serialisable via the hook)
  const draftValues = { name, contact, municipality, availability, vehicle };
  const draftSetters = {
    name: setName,
    contact: setContact,
    municipality: setMunicipality,
    availability: setAvailability,
    vehicle: setVehicle,
  };
  // Skip draft when profile already exists (user has server data; draft less useful)
  const { clearDraft, wasRestored } = useFormDraft(
    `voluntario-${slug}`,
    draftValues,
    draftSetters,
    // Disable when editing existing profile — pre-fill comes from server
    { debounce: existingProfile !== null ? 999999 : 600 },
  );

  // Clear draft on successful submit
  useEffect(() => {
    if (state.status === 'success') clearDraft();
  }, [state.status, clearDraft]);

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

  const skillOptions: { value: Skill; label: string }[] = [
    { value: 'driving', label: t.skill_driving },
    { value: 'medical', label: t.skill_medical },
    { value: 'logistics', label: t.skill_logistics },
    { value: 'cooking', label: t.skill_cooking },
    { value: 'languages', label: t.skill_languages },
    { value: 'admin', label: t.skill_admin },
    { value: 'general', label: t.skill_general },
  ];

  const availabilityOptions = [
    { value: 'immediate', label: t.availability_immediate },
    { value: 'this_week', label: t.availability_this_week },
    { value: 'flexible', label: t.availability_flexible },
  ] as const;

  const vehicleOptions = [
    { value: 'none', label: t.vehicle_none },
    { value: 'car', label: t.vehicle_car },
    { value: 'van', label: t.vehicle_van },
    { value: 'truck', label: t.vehicle_truck },
  ] as const;

  if (state.status === 'success') {
    return (
      <section
        role="alert"
        aria-live="polite"
        className="flex flex-col gap-6 rounded-lg border-2 border-navy bg-white p-6"
      >
        <p className="text-lg font-semibold text-ink leading-snug">
          {existingProfile !== null ? t.success_update : t.success_new}
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href={`/e/${slug}/mi-voluntariado`}
            className="flex items-center justify-center w-full py-4 px-6 text-base font-semibold text-white bg-navy rounded-lg hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 transition-colors"
          >
            {t.view_volunteering}
          </Link>
          <Link
            href={`/e/${slug}`}
            className="flex items-center justify-center w-full py-4 px-6 text-base font-semibold text-ink bg-white border-2 border-navy rounded-lg hover:bg-surface focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 transition-colors"
          >
            {backToEmergencyLabel}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {wasRestored && existingProfile === null && <DraftRestoredBanner />}

      {existingProfile !== null && (
        <div
          className="rounded-lg border-2 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="note"
        >
          <span className="font-semibold">{t.already_registered}</span>
        </div>
      )}

      {state.status === 'error' && (
        <ErrorMessage message={state.message} />
      )}

      {/* Nombre */}
      <FormField
        htmlFor="name"
        label={<>{t.name_label} <span aria-hidden="true">*</span></>}
      >
        <Input
          id="name"
          name="name"
          type="text"
          required
          minLength={2}
          placeholder={t.name_placeholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </FormField>

      {/* Contacto */}
      <FormField
        htmlFor="contact"
        label={<>{t.contact_label} <span aria-hidden="true">*</span></>}
      >
        <Input
          id="contact"
          name="contact"
          type="text"
          required
          minLength={2}
          placeholder={t.contact_placeholder}
          value={contact}
          onChange={(e) => setContact(e.target.value)}
        />
      </FormField>

      {/* Municipio */}
      <FormField
        htmlFor="municipality"
        label={<>{t.municipality_label} <span aria-hidden="true">*</span></>}
      >
        <Input
          id="municipality"
          name="municipality"
          type="text"
          required
          minLength={2}
          placeholder={t.municipality_placeholder}
          value={municipality}
          onChange={(e) => setMunicipality(e.target.value)}
        />
      </FormField>

      {/* Habilidades */}
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold text-ink uppercase tracking-wide">
          {t.skills_legend}
        </legend>
        <div className="flex flex-wrap gap-2">
          {skillOptions.map(({ value, label }) => {
            const active = selectedSkills.has(value);
            return (
              <label
                key={value}
                className={[
                  'inline-flex cursor-pointer select-none items-center rounded-full border-2 px-3 py-1 text-sm font-semibold transition-colors',
                  active
                    ? 'border-navy bg-navy text-white'
                    : 'border-line bg-white text-ink-soft hover:border-gray-500',
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
        label={<>{t.availability_label} <span aria-hidden="true">*</span></>}
      >
        <Select
          id="availability"
          name="availability"
          required
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
        >
          <option value="" disabled>
            {t.select_availability_placeholder}
          </option>
          {availabilityOptions.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </FormField>

      {/* Vehículo */}
      <FormField
        htmlFor="vehicle"
        label={<>{t.vehicle_label} <span aria-hidden="true">*</span></>}
      >
        <Select
          id="vehicle"
          name="vehicle"
          required
          value={vehicle}
          onChange={(e) => setVehicle(e.target.value)}
        >
          <option value="" disabled>
            {t.select_vehicle_placeholder}
          </option>
          {vehicleOptions.map(({ value, label }) => (
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
            className="mt-1 h-4 w-4 flex-shrink-0 cursor-pointer rounded border-2 border-navy accent-navy"
          />
          <label
            htmlFor="consentAccepted"
            className="text-sm text-ink-soft leading-snug cursor-pointer"
          >
            {t.consent_text}{' '}
            <span aria-hidden="true" className="text-red-600 font-bold">*</span>
          </label>
        </div>
      </div>

      <Button type="submit" disabled={pending} fullWidth>
        {pending
          ? t.submitting
          : existingProfile !== null
            ? t.submit_update
            : t.submit_new}
      </Button>
    </form>
  );
}

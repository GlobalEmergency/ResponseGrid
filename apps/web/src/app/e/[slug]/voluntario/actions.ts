'use server';

import { api } from '@/lib/api';
import type { components } from '@reliefhub/api-client';
import { requireSession, authHeaders, redirectToLogin } from '@/lib/auth';
import { getT } from '@/i18n/server';

type Skill = components['schemas']['RegisterVolunteerDto']['skills'][number];
type Availability = components['schemas']['RegisterVolunteerDto']['availability'];
type Vehicle = components['schemas']['RegisterVolunteerDto']['vehicle'];

export type VolunteerActionState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'upsert'; message: string }
  | { status: 'error'; message: string };

const VALID_SKILLS: Skill[] = [
  'driving',
  'medical',
  'logistics',
  'cooking',
  'languages',
  'admin',
  'general',
];

const VALID_AVAILABILITIES: Availability[] = ['immediate', 'this_week', 'flexible'];
const VALID_VEHICLES: Vehicle[] = ['none', 'car', 'van', 'truck'];

function isSkill(value: unknown): value is Skill {
  return VALID_SKILLS.includes(value as Skill);
}

function isAvailability(value: unknown): value is Availability {
  return VALID_AVAILABILITIES.includes(value as Availability);
}

function isVehicle(value: unknown): value is Vehicle {
  return VALID_VEHICLES.includes(value as Vehicle);
}

export async function registerVolunteer(
  slug: string,
  emergencyId: string,
  _prev: VolunteerActionState,
  formData: FormData,
): Promise<VolunteerActionState> {
  const token = await requireSession(`/e/${slug}/voluntario`);

  const { t } = await getT();

  const rawName = formData.get('name');
  const rawContact = formData.get('contact');
  const rawMunicipality = formData.get('municipality');
  const rawAvailability = formData.get('availability');
  const rawVehicle = formData.get('vehicle');
  const rawConsent = formData.get('consentAccepted');

  const name = typeof rawName === 'string' ? rawName.trim() : '';
  const contact = typeof rawContact === 'string' ? rawContact.trim() : '';
  const municipality = typeof rawMunicipality === 'string' ? rawMunicipality.trim() : '';

  if (name.length < 2) {
    return { status: 'error', message: t.voluntario.err_name_too_short };
  }
  if (contact.length < 2) {
    return { status: 'error', message: t.voluntario.err_contact_too_short };
  }
  if (municipality.length < 2) {
    return { status: 'error', message: t.voluntario.err_municipality_too_short };
  }
  if (!isAvailability(rawAvailability)) {
    return { status: 'error', message: t.voluntario.err_invalid_availability };
  }
  if (!isVehicle(rawVehicle)) {
    return { status: 'error', message: t.voluntario.err_invalid_vehicle };
  }

  const skills: Skill[] = formData.getAll('skills').filter(isSkill);

  const consentAccepted = rawConsent === 'on' || rawConsent === 'true';

  if (!consentAccepted) {
    return { status: 'error', message: t.voluntario.err_consent_required };
  }

  const { data, error, response } = await api.POST(
    '/emergencies/{emergencyId}/volunteers',
    {
      params: { path: { emergencyId } },
      headers: authHeaders(token),
      body: {
        name,
        contact,
        municipality,
        skills,
        availability: rawAvailability,
        vehicle: rawVehicle,
        consentAccepted,
      },
    },
  );

  if (response.status === 401) {
    return redirectToLogin(`/e/${slug}/voluntario`);
  }

  if (response.status === 409) {
    return {
      status: 'error',
      message: t.voluntario.err_intake_paused,
    };
  }

  if (response.status === 422) {
    return {
      status: 'error',
      message: t.voluntario.err_consent_data_required,
    };
  }

  if (error !== undefined || data === undefined) {
    const msg =
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof (error as { message: unknown }).message === 'string'
        ? (error as { message: string }).message
        : t.voluntario.err_register_failed;
    return { status: 'error', message: msg };
  }

  return { status: 'success' };
}

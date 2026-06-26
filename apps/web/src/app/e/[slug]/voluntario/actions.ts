'use server';

import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import type { components } from '@reliefhub/api-client';
import { getToken, authHeaders } from '@/lib/auth';

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
  emergencyId: string,
  _prev: VolunteerActionState,
  formData: FormData,
): Promise<VolunteerActionState> {
  const token = await getToken();
  if (!token) {
    redirect('/login');
  }

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
    return { status: 'error', message: 'El nombre debe tener al menos 2 caracteres.' };
  }
  if (contact.length < 2) {
    return { status: 'error', message: 'El contacto debe tener al menos 2 caracteres.' };
  }
  if (municipality.length < 2) {
    return { status: 'error', message: 'El municipio debe tener al menos 2 caracteres.' };
  }
  if (!isAvailability(rawAvailability)) {
    return { status: 'error', message: 'Disponibilidad no válida.' };
  }
  if (!isVehicle(rawVehicle)) {
    return { status: 'error', message: 'Tipo de vehículo no válido.' };
  }

  const skills: Skill[] = formData.getAll('skills').filter(isSkill);

  const consentAccepted = rawConsent === 'on' || rawConsent === 'true';

  if (!consentAccepted) {
    return { status: 'error', message: 'Debes aceptar el consentimiento para registrarte como voluntario.' };
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
    redirect('/login');
  }

  if (response.status === 409) {
    return {
      status: 'error',
      message: 'Esta emergencia no está aceptando voluntarios en este momento (en pausa).',
    };
  }

  if (response.status === 422) {
    return {
      status: 'error',
      message: 'Debes aceptar el consentimiento de tratamiento de datos para registrarte.',
    };
  }

  if (error !== undefined || data === undefined) {
    const msg =
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof (error as { message: unknown }).message === 'string'
        ? (error as { message: string }).message
        : 'Error al registrar. Inténtalo de nuevo.';
    return { status: 'error', message: msg };
  }

  return { status: 'success' };
}

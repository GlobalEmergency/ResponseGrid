'use server';

import { api } from '@/lib/api';

export type BuscarFamiliarState =
  | { status: 'idle' }
  | { status: 'success'; reportId: string }
  | { status: 'error'; message: string };

export async function createMissingPersonReport(
  emergencyId: string,
  _prev: BuscarFamiliarState,
  formData: FormData,
): Promise<BuscarFamiliarState> {
  // --- Extract fields ---
  const firstName = (formData.get('firstName') as string | null)?.trim() ?? '';
  const lastName = (formData.get('lastName') as string | null)?.trim() ?? '';
  const documentId = (formData.get('documentId') as string | null)?.trim() || undefined;
  const approximateAgeRaw = (formData.get('approximateAge') as string | null)?.trim();
  const approximateAge =
    approximateAgeRaw != null && approximateAgeRaw !== ''
      ? Number(approximateAgeRaw)
      : undefined;
  const lastKnownLocation =
    (formData.get('lastKnownLocation') as string | null)?.trim() ?? '';
  const description =
    (formData.get('description') as string | null)?.trim() || undefined;

  const reporterName = (formData.get('reporterName') as string | null)?.trim() ?? '';
  const reporterPhone =
    (formData.get('reporterPhone') as string | null)?.trim() ?? '';
  const reporterEmail =
    (formData.get('reporterEmail') as string | null)?.trim() || undefined;

  const consentGiven = formData.get('consentGiven') === 'on';

  // --- Validate required fields ---
  if (firstName.length < 1) {
    return { status: 'error', message: 'El nombre es obligatorio.' };
  }
  if (lastName.length < 1) {
    return { status: 'error', message: 'El apellido es obligatorio.' };
  }
  if (lastKnownLocation.length < 2) {
    return {
      status: 'error',
      message: 'La última ubicación conocida es obligatoria.',
    };
  }
  if (reporterName.length < 2) {
    return {
      status: 'error',
      message: 'Tu nombre de contacto es obligatorio.',
    };
  }
  if (reporterPhone.length < 6) {
    return {
      status: 'error',
      message: 'El teléfono de contacto es obligatorio.',
    };
  }
  if (!consentGiven) {
    return {
      status: 'error',
      message:
        'Debes aceptar el consentimiento de tratamiento de datos.',
    };
  }

  // --- Call API ---
  const { data, error, response } = await api.POST(
    '/emergencies/{emergencyId}/reunification',
    {
      params: { path: { emergencyId } },
      body: {
        person: {
          firstName,
          lastName,
          ...(documentId != null && { documentId }),
          ...(approximateAge != null && !isNaN(approximateAge) && { approximateAge }),
          lastKnownLocation,
          ...(description != null && { description }),
        },
        reporter: {
          name: reporterName,
          phone: reporterPhone,
          ...(reporterEmail != null && { email: reporterEmail }),
        },
        consentGiven,
      },
    },
  );

  if (response.status === 409) {
    return {
      status: 'error',
      message:
        'Esta emergencia está en pausa y no acepta nuevas solicitudes en este momento.',
    };
  }

  if (response.status === 422) {
    return {
      status: 'error',
      message: 'Debes aceptar el consentimiento de tratamiento de datos.',
    };
  }

  if (error !== undefined || data === undefined) {
    return {
      status: 'error',
      message: 'Error al enviar la solicitud. Inténtalo de nuevo.',
    };
  }

  return { status: 'success', reportId: data.id };
}

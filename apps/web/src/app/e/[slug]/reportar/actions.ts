'use server';

import { redirect } from 'next/navigation';
import { getToken, clearToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import type { components } from '@reliefhub/api-client';

export type ReportType =
  | 'incident'
  | 'stock'
  | 'status'
  | 'other'
  | 'structural_damage'
  | 'trapped_persons';
export type ReportPriority = 'low' | 'medium' | 'high' | 'urgent';

export type SubmitReportState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string };

const VALID_TYPES: ReportType[] = [
  'incident',
  'stock',
  'status',
  'other',
  'structural_damage',
  'trapped_persons',
];
const VALID_PRIORITIES: ReportPriority[] = ['low', 'medium', 'high', 'urgent'];

function isReportType(v: unknown): v is ReportType {
  return typeof v === 'string' && (VALID_TYPES as string[]).includes(v);
}

function isReportPriority(v: unknown): v is ReportPriority {
  return typeof v === 'string' && (VALID_PRIORITIES as string[]).includes(v);
}

export async function submitReport(
  emergencyId: string,
  _prev: SubmitReportState,
  formData: FormData,
): Promise<SubmitReportState> {
  const token = await getToken();
  if (token === null) {
    redirect(`/login`);
  }

  const type = formData.get('type');
  const priority = formData.get('priority');
  const note = formData.get('note');
  const resourceId = formData.get('resourceId');
  const photoUrlsRaw = formData.get('photoUrls');

  if (!isReportType(type)) {
    return { status: 'error', message: 'Selecciona un tipo de parte válido.' };
  }
  if (!isReportPriority(priority)) {
    return { status: 'error', message: 'Selecciona una prioridad válida.' };
  }
  if (typeof note !== 'string' || note.trim().length === 0) {
    return { status: 'error', message: 'La nota no puede estar vacía.' };
  }

  let photoUrls: string[] = [];
  if (typeof photoUrlsRaw === 'string' && photoUrlsRaw.trim().length > 0) {
    try {
      const parsed: unknown = JSON.parse(photoUrlsRaw);
      if (Array.isArray(parsed)) {
        photoUrls = parsed.filter((u): u is string => typeof u === 'string');
      }
    } catch {
      // ignore malformed JSON — submit without photos
    }
  }

  const body: components['schemas']['SubmitReportDto'] = {
    type,
    note: note.trim(),
    priority,
    photoUrls,
  };

  if (typeof resourceId === 'string' && resourceId.trim().length > 0) {
    body.resourceId = resourceId.trim();
  }

  // Parse structural detail fields when type is structural_damage or trapped_persons
  if (type === 'structural_damage' || type === 'trapped_persons') {
    const damageLevelRaw = formData.get('damageLevel');
    const VALID_DAMAGE_LEVELS = ['collapsed', 'severe', 'moderate'] as const;
    type DamageLevel = typeof VALID_DAMAGE_LEVELS[number];

    const isValidDamageLevel = (v: unknown): v is DamageLevel =>
      typeof v === 'string' && (VALID_DAMAGE_LEVELS as readonly string[]).includes(v);

    if (!isValidDamageLevel(damageLevelRaw)) {
      return { status: 'error', message: 'Selecciona el nivel de daño estructural.' };
    }

    const trappedRaw = formData.get('trappedPersonsEstimate');
    const accessibleRaw = formData.get('accessibleForRescue');
    const buildingTypeRaw = formData.get('buildingType');

    const structuralDetail: components['schemas']['StructuralDetailDto'] = {
      damageLevel: damageLevelRaw,
    };

    if (typeof trappedRaw === 'string' && trappedRaw.trim().length > 0) {
      const parsed = parseInt(trappedRaw.trim(), 10);
      if (!isNaN(parsed) && parsed >= 0) {
        structuralDetail.trappedPersonsEstimate = parsed;
      }
    }

    if (accessibleRaw === 'true') {
      structuralDetail.accessibleForRescue = true;
    }

    if (typeof buildingTypeRaw === 'string' && buildingTypeRaw.trim().length > 0) {
      structuralDetail.buildingType = buildingTypeRaw.trim();
    }

    body.structuralDetail = structuralDetail;
  }

  const { response } = await api.POST('/emergencies/{emergencyId}/reports', {
    params: { path: { emergencyId } },
    body,
    headers: authHeaders(token),
  });

  if (response.status === 401) {
    await clearToken();
    redirect(`/login`);
  }

  if (response.status === 403) {
    return { status: 'error', message: 'No tienes permisos para enviar partes en esta emergencia.' };
  }

  if (!response.ok) {
    return { status: 'error', message: 'No se pudo enviar el parte. Inténtalo de nuevo.' };
  }

  return { status: 'success' };
}

export type ReviewReportResult =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string };

export async function reviewReport(
  reportId: string,
  slug: string,
): Promise<ReviewReportResult> {
  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=/e/${slug}/coordinacion/reportes`);
  }

  const { response } = await api.POST('/reports/{reportId}/review', {
    params: { path: { reportId } },
    headers: authHeaders(token),
  });

  if (response.status === 401) {
    await clearToken();
    redirect(`/login?next=/e/${slug}/coordinacion/reportes`);
  }

  if (response.status === 403) {
    return { status: 'error', message: 'No tienes permisos para revisar este parte.' };
  }

  if (!response.ok) {
    return { status: 'error', message: 'No se pudo marcar como revisado. Inténtalo de nuevo.' };
  }

  return { status: 'success' };
}

export type PublishReportResult =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string };

export async function publishReport(
  reportId: string,
  slug: string,
  publishNote?: string,
): Promise<PublishReportResult> {
  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=/e/${slug}/coordinacion/reportes`);
  }

  const body: components['schemas']['PublishReportDto'] = {};
  if (typeof publishNote === 'string' && publishNote.trim().length > 0) {
    body.publishNote = publishNote.trim();
  }

  const { response } = await api.POST('/reports/{reportId}/publish', {
    params: { path: { reportId } },
    body,
    headers: authHeaders(token),
  });

  if (response.status === 401) {
    await clearToken();
    redirect(`/login?next=/e/${slug}/coordinacion/reportes`);
  }

  if (response.status === 403) {
    return { status: 'error', message: 'No tienes permisos para publicar este parte.' };
  }

  if (!response.ok) {
    return { status: 'error', message: 'No se pudo publicar el parte. Inténtalo de nuevo.' };
  }

  return { status: 'success' };
}

'use server';

import { api } from '@/lib/api';
import type { components } from '@reliefhub/api-client';
import { requireSession, authHeaders, redirectToLogin } from '@/lib/auth';
import { getT } from '@/i18n/server';

type CapacityMode = components['schemas']['PublishCapacityDto']['mode'];

export type CapacityState =
  | { status: 'idle' }
  | { status: 'success'; id: string }
  | { status: 'error'; message: string };

const VALID_MODES: CapacityMode[] = ['road', 'sea', 'air'];

function isMode(value: unknown): value is CapacityMode {
  return VALID_MODES.includes(value as CapacityMode);
}

// restricciones libres v1 — lista cerrada de checkboxes en la UI; el
// API acepta string[] arbitrario, así que sólo dejamos pasar las tres conocidas.
const VALID_CONSTRAINTS = ['refrigerated', 'hazmat', 'fragile'] as const;

/**
 * Parses a positive finite number from a FormData string value.
 * Returns `undefined` when the field is empty and `null` when it is present but
 * not a valid positive number (so the caller can distinguish "omitted" from
 * "invalid").
 */
function parsePositive(raw: FormDataEntryValue | null): number | undefined | null {
  if (typeof raw !== 'string' || raw.trim() === '') return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/**
 * Publishes a transport-capacity offer for the given emergency on behalf of the
 * current user (provider type `volunteer`). `emergencyId` and `providerId` are
 * bound server-side in the page so neither is trusted from the client form.
 */
export async function submitCapacity(
  slug: string,
  emergencyId: string,
  providerId: string,
  _prev: CapacityState,
  formData: FormData,
): Promise<CapacityState> {
  const token = await requireSession(`/e/${slug}/ofrecer-transporte`);

  const { t } = await getT();
  const tt = t.ofrecerTransporte;

  const rawMode = formData.get('mode');
  if (!isMode(rawMode)) {
    return { status: 'error', message: tt.err_invalid_mode };
  }

  const weightKg = parsePositive(formData.get('weightKg'));
  const volumeM3 = parsePositive(formData.get('volumeM3'));

  if (weightKg === null || volumeM3 === null) {
    return { status: 'error', message: tt.err_capacity_invalid };
  }
  if (weightKg === undefined && volumeM3 === undefined) {
    return { status: 'error', message: tt.err_capacity_required };
  }

  const rawCoverage = formData.get('coverageArea');
  const coverageArea = typeof rawCoverage === 'string' ? rawCoverage.trim() : '';
  if (coverageArea === '') {
    return { status: 'error', message: tt.err_coverage_required };
  }

  // Window (optional). datetime-local gives a value without timezone; convert
  // to ISO. Omit the whole window unless at least one bound is present.
  const rawFrom = formData.get('windowFrom');
  const rawTo = formData.get('windowTo');
  const fromStr = typeof rawFrom === 'string' ? rawFrom.trim() : '';
  const toStr = typeof rawTo === 'string' ? rawTo.trim() : '';

  const fromIso = fromStr !== '' ? new Date(fromStr).toISOString() : undefined;
  const toIso = toStr !== '' ? new Date(toStr).toISOString() : undefined;

  if (
    fromIso !== undefined &&
    toIso !== undefined &&
    new Date(toIso).getTime() <= new Date(fromIso).getTime()
  ) {
    return { status: 'error', message: tt.err_window_invalid };
  }

  const window =
    fromIso !== undefined || toIso !== undefined
      ? {
          ...(fromIso !== undefined ? { from: fromIso } : {}),
          ...(toIso !== undefined ? { to: toIso } : {}),
        }
      : undefined;

  const constraints = VALID_CONSTRAINTS.filter(
    (c) => formData.get(`constraint_${c}`) === 'on',
  );

  const rawNotes = formData.get('notes');
  const notes =
    typeof rawNotes === 'string' && rawNotes.trim() !== ''
      ? rawNotes.trim()
      : undefined;

  const { data, error, response } = await api.POST('/logistics/capacities', {
    headers: authHeaders(token),
    body: {
      emergencyId,
      // el proveedor es siempre el ciudadano autenticado (volunteer);
      // sin selector de proveedor ni org-as-provider en esta pantalla (#105).
      provider: { type: 'volunteer', id: providerId },
      mode: rawMode,
      capacity: {
        ...(weightKg !== undefined ? { weightKg } : {}),
        ...(volumeM3 !== undefined ? { volumeM3 } : {}),
      },
      // área libre v1; corredor por coords/resource-picking diferido —
      // el matching #107 admite áreas (rankea más abajo).
      coverage: { kind: 'area', area: coverageArea },
      ...(window !== undefined ? { window } : {}),
      ...(constraints.length > 0 ? { constraints } : {}),
      ...(notes !== undefined ? { notes } : {}),
    },
  });

  if (response.status === 401) {
    return redirectToLogin(`/e/${slug}/ofrecer-transporte`);
  }

  if (response.status === 409) {
    return {
      status: 'error',
      message: t.common.intake_paused,
    };
  }

  if (error !== undefined || data === undefined) {
    const msg =
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof (error as { message: unknown }).message === 'string'
        ? (error as { message: string }).message
        : tt.err_submit_failed;
    return { status: 'error', message: msg };
  }

  return { status: 'success', id: data.id };
}

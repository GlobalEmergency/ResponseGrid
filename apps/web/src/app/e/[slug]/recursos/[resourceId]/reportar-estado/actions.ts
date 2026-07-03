'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getToken, redirectToLogin, authHeaders, loginHref } from '@/lib/auth';
import { api } from '@/lib/api';
import type { components } from '@reliefhub/api-client';
import { getT } from '@/i18n/server';

export type ValidityReason = 'closed' | 'nonexistent' | 'moved' | 'outdated';

export type ReportValidityState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string };

const VALID_REASONS: ValidityReason[] = [
  'closed',
  'nonexistent',
  'moved',
  'outdated',
];

function isReason(v: unknown): v is ValidityReason {
  return typeof v === 'string' && (VALID_REASONS as string[]).includes(v);
}

export async function reportValidity(
  resourceId: string,
  slug: string,
  _prev: ReportValidityState,
  formData: FormData,
): Promise<ReportValidityState> {
  const next = `/e/${slug}/recursos/${resourceId}/reportar-estado`;
  const token = await getToken();
  if (token === null) {
    redirect(loginHref(next));
  }

  const { t } = await getT();

  const reason = formData.get('reason');
  const note = formData.get('note');
  const photoUrlsRaw = formData.get('photoUrls');

  if (!isReason(reason)) {
    return { status: 'error', message: t.reportar_validez.err_invalid_reason };
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

  const body: components['schemas']['ReportResourceValidityDto'] = { reason };
  if (typeof note === 'string' && note.trim().length > 0) {
    body.note = note.trim();
  }
  if (photoUrls.length > 0) {
    body.photoUrls = photoUrls;
  }

  const { response } = await api.POST(
    '/resources/{resourceId}/validity-reports',
    {
      params: { path: { resourceId } },
      body,
      headers: authHeaders(token),
    },
  );

  if (response.status === 401) {
    return redirectToLogin(next);
  }
  if (response.status === 403) {
    return { status: 'error', message: t.reportar_validez.err_owner };
  }
  if (response.status === 409) {
    return { status: 'error', message: t.reportar_validez.err_not_visible };
  }
  if (!response.ok) {
    return { status: 'error', message: t.reportar_validez.err_submit_failed };
  }

  // Refresh cached server renders so a freshly-crossed dispute threshold (the
  // "En verificación" badge on the map/detail) shows on the next view.
  revalidatePath(`/e/${slug}`);
  revalidatePath(`/e/${slug}/recursos/${resourceId}`);

  return { status: 'success' };
}

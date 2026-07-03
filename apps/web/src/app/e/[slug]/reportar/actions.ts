'use server';

import { redirect } from 'next/navigation';
import { requireSession, getToken, authHeaders, redirectToLogin } from '@/lib/auth';
import { api } from '@/lib/api';
import type { components } from '@reliefhub/api-client';
import { getT } from '@/i18n/server';

export type ReportType = 'incident' | 'stock' | 'status' | 'other';
export type ReportPriority = 'low' | 'medium' | 'high' | 'urgent';

export type SubmitReportState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string };

const VALID_TYPES: ReportType[] = ['incident', 'stock', 'status', 'other'];
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

  const { t } = await getT();

  const type = formData.get('type');
  const priority = formData.get('priority');
  const note = formData.get('note');
  const resourceId = formData.get('resourceId');
  const photoUrlsRaw = formData.get('photoUrls');

  if (!isReportType(type)) {
    return { status: 'error', message: t.reportar.err_invalid_type };
  }
  if (!isReportPriority(priority)) {
    return { status: 'error', message: t.reportar.err_invalid_priority };
  }
  if (typeof note !== 'string' || note.trim().length === 0) {
    return { status: 'error', message: t.reportar.err_note_required };
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

  const { response } = await api.POST('/emergencies/{emergencyId}/reports', {
    params: { path: { emergencyId } },
    body,
    headers: authHeaders(token),
  });

  if (response.status === 401) {
    return redirectToLogin();
  }

  if (response.status === 403) {
    return { status: 'error', message: t.reportar.err_no_permission };
  }

  if (!response.ok) {
    return { status: 'error', message: t.reportar.err_submit_failed };
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
  const token = await requireSession(`/emergencies/${slug}/manage/reports`);

  const { t } = await getT();

  const { response } = await api.POST('/reports/{reportId}/review', {
    params: { path: { reportId } },
    headers: authHeaders(token),
  });

  if (response.status === 401) {
    return redirectToLogin(`/emergencies/${slug}/manage/reports`);
  }

  if (response.status === 403) {
    return { status: 'error', message: t.reportar.err_no_permission_review };
  }

  if (!response.ok) {
    return { status: 'error', message: t.reportar.err_mark_reviewed_failed };
  }

  return { status: 'success' };
}

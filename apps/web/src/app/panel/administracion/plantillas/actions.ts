'use server';

import { revalidatePath } from 'next/cache';
import { getToken, clearToken, authHeaders } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { getT } from '@/i18n/server';
import type { components } from '@reliefhub/api-client';

export type TemplateActionResult =
  | { status: 'idle' }
  | { status: 'success'; message?: string }
  | { status: 'error'; message: string };

export type TemplateViewDto = components['schemas']['TemplateViewDto'];

// ── List ────────────────────────────────────────────────────────────────────

export async function fetchTemplates(): Promise<TemplateViewDto[]> {
  const token = await getToken();
  if (!token) return [];

  const { data, error } = await api.GET('/templates', {
    headers: authHeaders(token),
  });

  if (error !== undefined) return [];

  return data ?? [];
}

// ── Create ──────────────────────────────────────────────────────────────────

export async function createTemplateAction(
  _prev: TemplateActionResult,
  formData: FormData,
): Promise<TemplateActionResult> {
  const token = await getToken();
  if (!token) {
    redirect('/login?next=/panel/administracion/plantillas');
  }

  const { t } = await getT();

  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const dontBringRaw = String(formData.get('dontBringList') ?? '');
  const defaultAnnouncement =
    String(formData.get('defaultAnnouncement') ?? '').trim() || null;

  if (!name) {
    return { status: 'error', message: t.templates.err_name_required };
  }
  if (!description) {
    return { status: 'error', message: t.templates.err_description_required };
  }

  const dontBringList = dontBringRaw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (dontBringList.length === 0) {
    return {
      status: 'error',
      message: t.templates.err_dont_bring_empty,
    };
  }

  const { error, response } = await api.POST('/templates', {
    body: { name, description, dontBringList, defaultAnnouncement },
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 401) {
      await clearToken();
      redirect('/login?next=/panel/administracion/plantillas');
    }
    if (response.status === 403) {
      return { status: 'error', message: t.templates.err_no_permission_create };
    }
    if (response.status === 400) {
      return { status: 'error', message: t.templates.err_invalid_data };
    }
    return { status: 'error', message: t.templates.err_create_failed };
  }

  revalidatePath('/panel/administracion/plantillas');
  return { status: 'success', message: t.templates.ok_created };
}

// ── Delete ──────────────────────────────────────────────────────────────────

export async function deleteTemplateAction(id: string): Promise<TemplateActionResult> {
  const token = await getToken();
  if (!token) {
    redirect('/login?next=/panel/administracion/plantillas');
  }

  const { t } = await getT();

  const { error, response } = await api.DELETE('/templates/{id}', {
    params: { path: { id } },
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 401) {
      await clearToken();
      redirect('/login?next=/panel/administracion/plantillas');
    }
    if (response.status === 403) {
      return { status: 'error', message: t.templates.err_no_permission_delete };
    }
    if (response.status === 404) {
      return { status: 'error', message: t.templates.err_not_found };
    }
    return { status: 'error', message: t.templates.err_delete_failed };
  }

  revalidatePath('/panel/administracion/plantillas');
  return { status: 'success' };
}

// ── Create from template ────────────────────────────────────────────────────

export type CreateFromTemplateResult =
  | { status: 'idle' }
  | { status: 'success'; slug: string }
  | { status: 'error'; message: string };

export async function createFromTemplateAction(
  _prev: CreateFromTemplateResult,
  formData: FormData,
): Promise<CreateFromTemplateResult> {
  const token = await getToken();
  if (!token) {
    redirect('/login?next=/panel/administracion/plantillas');
  }

  const { t } = await getT();

  const templateId = String(formData.get('templateId') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim();
  const country = String(formData.get('country') ?? '').trim();

  if (!templateId) {
    return { status: 'error', message: t.templates.err_template_required };
  }
  if (!name) {
    return { status: 'error', message: t.templates.err_emergency_name_required };
  }
  if (!slug) {
    return { status: 'error', message: t.templates.err_slug_required };
  }
  if (!country) {
    return { status: 'error', message: t.templates.err_country_required };
  }

  const { data, error, response } = await api.POST('/emergencies/from-template', {
    body: { templateId, name, slug, country },
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 401) {
      await clearToken();
      redirect('/login?next=/panel/administracion/plantillas');
    }
    if (response.status === 403) {
      return { status: 'error', message: t.templates.err_no_permission_create_emergency };
    }
    if (response.status === 404) {
      return { status: 'error', message: t.templates.err_not_found };
    }
    if (response.status === 400) {
      return { status: 'error', message: t.templates.err_invalid_slug_country };
    }
    return { status: 'error', message: t.templates.err_create_emergency_failed };
  }

  const createdSlug = data?.slug ?? slug;

  revalidatePath('/panel/administracion/plantillas');
  return { status: 'success', slug: createdSlug };
}

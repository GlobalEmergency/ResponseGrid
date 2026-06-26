'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { getToken, authHeaders } from '@/lib/auth';

export type OrgActionResult =
  | { status: 'idle' }
  | { status: 'success'; id?: string }
  | { status: 'error'; message: string };

export async function createOrganizationAction(
  _prev: OrgActionResult,
  formData: FormData,
): Promise<OrgActionResult> {
  const token = await getToken();
  if (!token) {
    redirect('/login?next=/organizaciones');
  }

  const name = String(formData.get('name') ?? '').trim();
  const type = String(formData.get('type') ?? '').trim();
  const taxId = String(formData.get('taxId') ?? '').trim() || undefined;
  const contactEmail = String(formData.get('contactEmail') ?? '').trim() || undefined;

  if (!name || !type) {
    return { status: 'error', message: 'El nombre y el tipo son obligatorios.' };
  }

  const { data, error, response } = await api.POST('/organizations', {
    headers: authHeaders(token),
    body: { name, type: type as 'ngo' | 'company' | 'public_admin' | 'association' | 'other', taxId, contactEmail },
  });

  if (error !== undefined || data === undefined) {
    if (response.status === 401) redirect('/login?next=/organizaciones');
    return { status: 'error', message: 'Error al crear la organización. Inténtalo de nuevo.' };
  }

  revalidatePath('/organizaciones');
  redirect(`/organizaciones/${data.id}`);
}

export async function addMemberAction(
  orgId: string,
  _prev: OrgActionResult,
  formData: FormData,
): Promise<OrgActionResult> {
  const token = await getToken();
  if (!token) {
    redirect(`/login?next=/organizaciones/${orgId}`);
  }

  const email = String(formData.get('email') ?? '').trim();
  if (!email) {
    return { status: 'error', message: 'El email es obligatorio.' };
  }

  const { error, response } = await api.POST('/organizations/{id}/members', {
    params: { path: { id: orgId } },
    headers: authHeaders(token),
    body: { email },
  });

  if (error !== undefined) {
    if (response.status === 401) redirect(`/login?next=/organizaciones/${orgId}`);
    if (response.status === 403) {
      return { status: 'error', message: 'Solo el propietario puede gestionar miembros.' };
    }
    if (response.status === 404) {
      return { status: 'error', message: 'No existe un usuario con ese email.' };
    }
    if (response.status === 409) {
      return { status: 'error', message: 'Este usuario ya es miembro de la organización.' };
    }
    return { status: 'error', message: 'Error al añadir el miembro. Inténtalo de nuevo.' };
  }

  revalidatePath(`/organizaciones/${orgId}`);
  return { status: 'success' };
}

export async function removeMemberAction(
  orgId: string,
  userId: string,
): Promise<OrgActionResult> {
  const token = await getToken();
  if (!token) {
    redirect(`/login?next=/organizaciones/${orgId}`);
  }

  const { error, response } = await api.DELETE('/organizations/{id}/members/{userId}', {
    params: { path: { id: orgId, userId } },
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 401) redirect(`/login?next=/organizaciones/${orgId}`);
    if (response.status === 403) {
      return { status: 'error', message: 'Solo el propietario puede gestionar miembros.' };
    }
    if (response.status === 422) {
      return { status: 'error', message: 'El propietario no puede eliminarse a sí mismo.' };
    }
    return { status: 'error', message: 'Error al eliminar el miembro. Inténtalo de nuevo.' };
  }

  revalidatePath(`/organizaciones/${orgId}`);
  return { status: 'success' };
}

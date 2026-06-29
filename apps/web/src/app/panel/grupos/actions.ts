'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getToken, clearToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';

export type GroupActionResult =
  | { status: 'idle' }
  | { status: 'success'; message?: string }
  | { status: 'error'; message: string };

export interface MyGroup {
  id: string;
  name: string;
  visibility: string;
  ownerKind: string;
  ownerId: string;
  membershipStatus: string;
}

export interface GroupInfo {
  id: string;
  name: string;
  visibility: string;
  ownerKind: string;
  ownerId: string;
}

export interface GroupMember {
  userId: string;
  status: string;
  addedByUserId: string | null;
}

/** Groups I belong to (any status). */
export async function fetchMyGroups(): Promise<MyGroup[]> {
  const token = await getToken();
  if (!token) return [];
  const { data, error } = await api.GET('/groups/mine', {
    headers: authHeaders(token),
  });
  if (error !== undefined) return [];
  return (data ?? []) as MyGroup[];
}

/** A group's basic info, or null if not found. */
export async function fetchGroup(groupId: string): Promise<GroupInfo | null> {
  const token = await getToken();
  if (!token) return null;
  const { data, error } = await api.GET('/groups/{groupId}', {
    params: { path: { groupId } },
    headers: authHeaders(token),
  });
  if (error !== undefined || !data) return null;
  return data as GroupInfo;
}

/**
 * A group's members. Returns `null` when the caller is not allowed to read them
 * (403) — the detail page uses that to switch between manager and member views.
 */
export async function fetchGroupMembers(
  groupId: string,
): Promise<GroupMember[] | null> {
  const token = await getToken();
  if (!token) return null;
  const { data, error, response } = await api.GET('/groups/{groupId}/members', {
    params: { path: { groupId } },
    headers: authHeaders(token),
  });
  if (error !== undefined) {
    if (response.status === 403) return null;
    return [];
  }
  return (data ?? []) as GroupMember[];
}

export async function createGroupAction(
  _prev: GroupActionResult,
  formData: FormData,
): Promise<GroupActionResult> {
  const token = await getToken();
  if (!token) redirect('/login?next=/panel/grupos');

  const name = String(formData.get('name') ?? '').trim();
  const visibility = String(formData.get('visibility') ?? 'private');
  const ownerKind = String(formData.get('ownerKind') ?? '');
  const ownerId = String(formData.get('ownerId') ?? '').trim();

  if (!name) return { status: 'error', message: 'El nombre es obligatorio.' };
  if (ownerKind !== 'organization' && ownerKind !== 'emergency') {
    return { status: 'error', message: 'Elige el tipo de dueño.' };
  }
  if (!ownerId) {
    return { status: 'error', message: 'El ID del dueño es obligatorio.' };
  }

  const { error, response } = await api.POST('/groups', {
    body: {
      name,
      visibility: visibility as 'public' | 'private',
      ownerKind: ownerKind as 'organization' | 'emergency',
      ownerId,
    },
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 401) {
      await clearToken();
      redirect('/login?next=/panel/grupos');
    }
    if (response.status === 403) {
      return {
        status: 'error',
        message: 'No tienes permiso para crear grupos en ese ámbito.',
      };
    }
    return { status: 'error', message: 'No se pudo crear el grupo.' };
  }

  revalidatePath('/panel/grupos');
  return { status: 'success', message: 'Grupo creado. Eres su manager.' };
}

export async function requestToJoinAction(
  groupId: string,
): Promise<GroupActionResult> {
  const token = await getToken();
  if (!token) redirect(`/login?next=/panel/grupos/${groupId}`);

  const { error, response } = await api.POST('/groups/{groupId}/join', {
    params: { path: { groupId } },
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 409) {
      return {
        status: 'error',
        message: 'El grupo no es público o ya tienes una solicitud.',
      };
    }
    return { status: 'error', message: 'No se pudo enviar la solicitud.' };
  }

  revalidatePath(`/panel/grupos/${groupId}`);
  return { status: 'success', message: 'Solicitud enviada. Espera aprobación.' };
}

export async function approveMemberAction(
  groupId: string,
  userId: string,
): Promise<GroupActionResult> {
  const token = await getToken();
  if (!token) redirect(`/login?next=/panel/grupos/${groupId}`);

  const { error } = await api.POST(
    '/groups/{groupId}/members/{userId}/approve',
    {
      params: { path: { groupId, userId } },
      headers: authHeaders(token),
    },
  );

  if (error !== undefined) {
    return { status: 'error', message: 'No se pudo aprobar al miembro.' };
  }
  revalidatePath(`/panel/grupos/${groupId}`);
  return { status: 'success' };
}

export async function addMemberByEmailAction(
  _prev: GroupActionResult,
  formData: FormData,
): Promise<GroupActionResult> {
  const token = await getToken();
  const groupId = String(formData.get('groupId') ?? '');
  if (!token) redirect(`/login?next=/panel/grupos/${groupId}`);

  const email = String(formData.get('email') ?? '').trim();
  if (!email) return { status: 'error', message: 'El email es obligatorio.' };

  const { error, response } = await api.POST('/groups/{groupId}/members', {
    params: { path: { groupId } },
    body: { email },
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 404) {
      return {
        status: 'error',
        message: 'No existe ningún usuario con ese email.',
      };
    }
    if (response.status === 403) {
      return { status: 'error', message: 'No tienes permiso para añadir miembros.' };
    }
    if (response.status === 409) {
      return { status: 'error', message: 'Esa persona ya es miembro del grupo.' };
    }
    return { status: 'error', message: 'No se pudo añadir al miembro.' };
  }

  revalidatePath(`/panel/grupos/${groupId}`);
  return { status: 'success', message: 'Miembro añadido.' };
}

export async function assignManagerAction(
  groupId: string,
  userId: string,
): Promise<GroupActionResult> {
  const token = await getToken();
  if (!token) redirect(`/login?next=/panel/grupos/${groupId}`);

  const { error, response } = await api.POST('/groups/{groupId}/managers', {
    params: { path: { groupId } },
    body: { userId },
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 403) {
      return {
        status: 'error',
        message:
          'No puedes nombrar managers aquí (necesitas ser manager del grupo).',
      };
    }
    return { status: 'error', message: 'No se pudo nombrar manager.' };
  }
  revalidatePath(`/panel/grupos/${groupId}`);
  return { status: 'success', message: 'Manager nombrado.' };
}

'use server';

import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';
import { getToken, authHeaders } from '@/lib/auth';

export type ProfileActionResult =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string };

export async function updateProfileAction(
  _prev: ProfileActionResult,
  formData: FormData,
): Promise<ProfileActionResult> {
  const token = await getToken();
  if (!token) return { status: 'error', message: 'No autenticado' };

  const name = (formData.get('name') as string | null)?.trim() || undefined;
  const rawPhone = (formData.get('phone') as string | null)?.trim() ?? '';
  const phone: string | null = rawPhone === '' ? null : rawPhone;

  const { error } = await api.PATCH('/auth/me', {
    headers: authHeaders(token),
    body: { name, phone },
  });

  if (error !== undefined) return { status: 'error', message: 'Error al guardar' };

  revalidatePath('/panel/mi-perfil');
  return { status: 'success' };
}

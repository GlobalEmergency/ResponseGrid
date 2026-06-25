'use server';

import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { setToken } from '@/lib/auth';

export type SignupResult =
  | { status: 'idle' }
  | { status: 'error'; message: string };

export async function signupAction(
  next: string,
  _prev: SignupResult,
  formData: FormData,
): Promise<SignupResult> {
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!name || !email || !password) {
    return { status: 'error', message: 'Todos los campos son obligatorios.' };
  }

  if (password.length < 8) {
    return {
      status: 'error',
      message: 'La contraseña debe tener al menos 8 caracteres.',
    };
  }

  const { data, error, response } = await api.POST('/auth/register', {
    body: { name, email, password },
  });

  if (response.status === 409) {
    return { status: 'error', message: 'Ese email ya está registrado.' };
  }

  if (error !== undefined || data === undefined) {
    return {
      status: 'error',
      message: 'Error al crear la cuenta. Inténtalo de nuevo.',
    };
  }

  await setToken(data.accessToken);
  redirect(next || '/');
}

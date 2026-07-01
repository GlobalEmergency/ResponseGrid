'use server';

import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { setToken } from '@/lib/auth';
import { safeNextPath } from '@/lib/safe-next';
import { getT } from '@/i18n/server';

export type LoginResult =
  | { status: 'idle' }
  | { status: 'error'; message: string };

export async function loginAction(
  next: string,
  _prev: LoginResult,
  formData: FormData,
): Promise<LoginResult> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  const { data, error } = await api.POST('/auth/login', {
    body: { email, password },
  });

  if (error !== undefined || data === undefined) {
    const { t } = await getT();
    return { status: 'error', message: t.login.err_invalid_credentials };
  }

  await setToken(data.accessToken);
  // Only allow internal relative paths (prevents open-redirect attacks).
  redirect(safeNextPath(next) ?? '/dashboard');
}

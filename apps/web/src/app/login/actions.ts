'use server';

import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { setToken } from '@/lib/auth';
import { postAuthPath } from '@/lib/post-auth';
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
  // Route through onboarding when the profile is incomplete; otherwise to `next`
  // (safeNextPath inside postAuthPath prevents open-redirect attacks).
  redirect(await postAuthPath(data.accessToken, next));
}

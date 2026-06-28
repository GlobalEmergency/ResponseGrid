'use server';

import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { setToken } from '@/lib/auth';
import { getT } from '@/i18n/server';

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

  const { t } = await getT();

  if (!name || !email || !password) {
    return { status: 'error', message: t.signup.err_all_fields_required };
  }

  if (password.length < 8) {
    return {
      status: 'error',
      message: t.signup.err_password_too_short,
    };
  }

  const { data, error, response } = await api.POST('/auth/register', {
    body: { name, email, password },
  });

  if (response.status === 409) {
    return { status: 'error', message: t.signup.err_email_exists };
  }

  if (error !== undefined || data === undefined) {
    return {
      status: 'error',
      message: t.signup.err_signup_failed,
    };
  }

  await setToken(data.accessToken);
  // Sanitize the redirect target: only allow internal relative paths to prevent
  // open redirect attacks (e.g. ?next=https://evil.com or ?next=//evil.com).
  const safe =
    typeof next === 'string' && next.startsWith('/') && !next.startsWith('//')
      ? next
      : '/';
  redirect(safe);
}

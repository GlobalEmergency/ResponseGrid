'use server';

import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { setToken } from '@/lib/auth';
import { safeNextPath } from '@/lib/safe-next';
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
  const phone = String(formData.get('phone') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const consent = formData.get('consent') != null;

  const { t } = await getT();

  if (!name || !email || !password) {
    return { status: 'error', message: t.signup.err_all_fields_required };
  }

  if (!phone) {
    return { status: 'error', message: t.signup.err_phone_required };
  }

  if (password.length < 8) {
    return {
      status: 'error',
      message: t.signup.err_password_too_short,
    };
  }

  if (!consent) {
    return { status: 'error', message: t.signup.err_consent_required };
  }

  const { data, error, response } = await api.POST('/auth/register', {
    body: {
      name,
      email,
      phone,
      password,
      acceptedTerms: true,
      acceptedPrivacy: true,
    },
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
  // Only allow internal relative paths (prevents open-redirect attacks).
  redirect(safeNextPath(next) ?? '/dashboard');
}

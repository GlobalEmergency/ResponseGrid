'use server';

import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { requireSession, authHeaders } from '@/lib/auth';
import { safeNextPath } from '@/lib/safe-next';
import { getT } from '@/i18n/server';

export type OnboardingResult =
  | { status: 'idle' }
  | { status: 'error'; message: string };

export async function onboardingAction(
  next: string,
  _prev: OnboardingResult,
  formData: FormData,
): Promise<OnboardingResult> {
  const phone = String(formData.get('phone') ?? '').trim();
  const consent = formData.get('consent') != null;

  const { t } = await getT();

  if (!phone) {
    return { status: 'error', message: t.onboarding.err_phone_required };
  }
  if (!consent) {
    return { status: 'error', message: t.onboarding.err_consent_required };
  }

  const token = await requireSession(next);

  const { error } = await api.POST('/auth/onboarding', {
    headers: authHeaders(token),
    body: { phone, acceptedTerms: true, acceptedPrivacy: true },
  });

  if (error !== undefined) {
    return { status: 'error', message: t.onboarding.error_fallback };
  }

  redirect(safeNextPath(next) ?? '/dashboard');
}

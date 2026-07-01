'use server';

import { redirect } from 'next/navigation';
import { setToken } from '@/lib/auth';
import { postAuthPath } from '@/lib/post-auth';

/**
 * Receives the JWT token that arrived in the URL fragment after OAuth callback,
 * stores it as an httpOnly cookie, then routes the user: to `/auth/onboarding`
 * when the profile is incomplete (social sign-ups have no phone/consent yet), or
 * to `next` (the page that started the login), falling back to the panel.
 */
export async function completeOAuthAction(
  token: string,
  next?: string,
): Promise<never> {
  if (!token || typeof token !== 'string' || token.trim() === '') {
    redirect('/login?error=oauth_failed');
  }
  const clean = token.trim();
  await setToken(clean);
  redirect(await postAuthPath(clean, next));
}

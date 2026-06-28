'use server';

import { redirect } from 'next/navigation';
import { setToken } from '@/lib/auth';
import { safeNextPath } from '@/lib/safe-next';

/**
 * Receives the JWT token that arrived in the URL fragment after OAuth callback,
 * stores it as an httpOnly cookie, then redirects to `next` — the page that
 * originally sent the user to login — falling back to the app root.
 */
export async function completeOAuthAction(
  token: string,
  next?: string,
): Promise<never> {
  if (!token || typeof token !== 'string' || token.trim() === '') {
    redirect('/login?error=oauth_failed');
  }
  await setToken(token.trim());
  redirect(safeNextPath(next) ?? '/');
}

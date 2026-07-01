import { api } from '@/lib/api';
import { authHeaders } from '@/lib/auth';
import { safeNextPath } from '@/lib/safe-next';

/**
 * Resolves where to send the user right after authenticating. If their profile
 * is incomplete (missing phone or not having accepted the current legal
 * documents — social sign-ups, pre-existing accounts, or a bumped consent
 * version), route them through onboarding first, preserving the intended
 * destination. Server-only (uses the API client).
 */
export async function postAuthPath(
  token: string,
  next?: string | null,
): Promise<string> {
  const target = safeNextPath(next) ?? '/panel';
  const { data } = await api.GET('/auth/me', { headers: authHeaders(token) });
  if (data && data.profileComplete === false) {
    return `/auth/onboarding?next=${encodeURIComponent(target)}`;
  }
  return target;
}

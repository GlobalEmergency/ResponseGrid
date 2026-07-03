import { notFound } from 'next/navigation';
import { requireSession, authHeaders, redirectToLogin } from '@/lib/auth';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { getMe, getRoles } from '@/lib/navigation-data';
import {
  resolveEmergencyAccess,
  type EmergencyAccess,
} from '@/lib/emergency-permissions';
import type { MeGrant, RoleCatalogEntry } from '@/lib/admin-scopes';

type Emergency = NonNullable<Awaited<ReturnType<typeof getEmergencyBySlug>>>;
type AuthHeaders = ReturnType<typeof authHeaders>;

/**
 * Shared prologue for the emergency workspace layout + its section pages:
 * resolves the session, loads the emergency (404 if missing), loads the
 * caller's identity (redirect to login if unauthenticated) and computes
 * their `EmergencyAccess` for it. Callers still apply their own per-section
 * permission gate afterwards.
 */
export async function resolveManageAccess(
  slug: string,
  returnPath: string,
): Promise<{
  token: string;
  emergency: Emergency;
  access: EmergencyAccess;
  headers: AuthHeaders;
}> {
  const token = await requireSession(returnPath);

  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) {
    notFound();
  }

  const [me, roles] = await Promise.all([getMe(), getRoles()]);
  if (me == null) {
    return redirectToLogin(returnPath);
  }

  const access: EmergencyAccess = resolveEmergencyAccess(
    emergency.id,
    (me.grants ?? []) as MeGrant[],
    roles as RoleCatalogEntry[],
  );

  return { token, emergency, access, headers: authHeaders(token) };
}

/**
 * Server-only data layer for the app shell. Each loader is wrapped in React
 * `cache()` so a section layout and the page it wraps share a single network
 * round-trip within one request. Never import from a Client Component.
 */
import { cache } from 'react';
import { getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import type { MyEmergencyNav } from '@/lib/navigation';
import { buildPrincipalContexts, type PrincipalContext } from '@/lib/navigation';

export const getMe = cache(async () => {
  const token = await getToken();
  if (token == null) return null;
  const { data, response } = await api.GET('/auth/me', {
    headers: authHeaders(token),
  });
  if (response.status === 401) return null;
  return data ?? null;
});

export const getRoles = cache(async () => {
  const token = await getToken();
  if (token == null) return [];
  const { data } = await api.GET('/roles', { headers: authHeaders(token) });
  return data ?? [];
});

export const getNotificationUnread = cache(async (): Promise<number> => {
  const token = await getToken();
  if (token == null) return 0;
  const { data } = await api.GET('/notifications/mine', {
    headers: authHeaders(token),
  });
  return data?.unreadCount ?? 0;
});

/**
 * The emergencies the principal holds a (non-expired) grant in, resolved to
 * {id, slug, name, roleIds}. Backed by `/emergencies/mine`, which resolves the
 * principal's emergency-scoped grants server-side and — unlike the public
 * `/emergencies` list — includes paused/closed emergencies, so a verifier or
 * coordinator keeps reaching the coordination panel after the emergency is
 * paused.
 */
export const getMyEmergencies = cache(async (): Promise<MyEmergencyNav[]> => {
  const token = await getToken();
  if (token == null) return [];
  const { data, response } = await api.GET('/emergencies/mine', {
    headers: authHeaders(token),
  });
  if (response.status === 401) return [];
  return (data ?? []).map((e) => ({
    id: e.id,
    slug: e.slug,
    name: e.name,
    roleIds: e.roleIds,
  }));
});

/** An active emergency, slimmed to what the panel overlay renders. */
export interface ActiveEmergencyNav {
  id: string;
  slug: string;
  name: string;
  status: 'active' | 'paused' | 'closed';
}

/**
 * The publicly listed ACTIVE emergencies, backed by `GET /emergencies` (the
 * same list the landing uses). Unauthenticated — the endpoint is public — so
 * it never needs the principal's token. The panel uses this to give platform
 * coordinators/admins (who hold no emergency-scoped grant) a one-click path
 * into any emergency's coordination/validation queues.
 */
export const getActiveEmergencies = cache(
  async (): Promise<ActiveEmergencyNav[]> => {
    const { data } = await api.GET('/emergencies', {});
    return (data ?? []).map((e) => ({
      id: e.id,
      slug: e.slug,
      name: e.name,
      status: e.status,
    }));
  },
);

export const getMyOrganizations = cache(async () => {
  const token = await getToken();
  if (token == null) return [];
  const { data } = await api.GET('/organizations/mine', { headers: authHeaders(token) });
  return (data ?? []).map((o) => ({ id: o.id, name: o.name }));
});

export const getMyGroups = cache(async () => {
  const token = await getToken();
  if (token == null) return [];
  const { data } = await api.GET('/groups/mine', { headers: authHeaders(token) });
  return (data ?? []).map((g) => ({ id: g.id, name: g.name }));
});

/** Resources are emergency-scoped: aggregate `resources/mine` across the principal's
 *  emergencies. Carries every resource type (collection points, warehouses, transport,
 *  suppliers, venues, …) — the principal manages all of it, not just collection points.
 *  N+1 cached calls (see Global Constraints ceiling). */
export const getMyResources = cache(async () => {
  const token = await getToken();
  if (token == null) return [];
  const emergencies = await getMyEmergencies();
  const perEmergency = await Promise.all(
    emergencies.map(async (e) => {
      const { data } = await api.GET('/emergencies/{emergencyId}/resources/mine', {
        headers: authHeaders(token),
        params: { path: { emergencyId: e.id } },
      });
      return (data ?? []).map((r) => ({ id: r.id, name: r.name, resourceType: r.type }));
    }),
  );
  return perEmergency.flat();
});

export const getPrincipalContexts = cache(async (): Promise<PrincipalContext[]> => {
  const [emergencies, resources, organizations, groups] = await Promise.all([
    getMyEmergencies(), getMyResources(), getMyOrganizations(), getMyGroups(),
  ]);
  return buildPrincipalContexts({ emergencies, resources, organizations, groups });
});

/** Everything the dashboard shell needs in one cached call. */
export const getNavContext = cache(async () => {
  const [me, roles, notificationUnread, contexts] = await Promise.all([
    getMe(),
    getRoles(),
    getNotificationUnread(),
    getPrincipalContexts(),
  ]);
  return { me, roles, notificationUnread, contexts };
});

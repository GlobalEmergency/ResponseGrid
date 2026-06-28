/**
 * Server-only data layer for the app shell. Each loader is wrapped in React
 * `cache()` so a section layout and the page it wraps share a single network
 * round-trip within one request. Never import from a Client Component.
 */
import { cache } from 'react';
import { getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import type { MyEmergencyNav } from '@/lib/navigation';

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
 * The active emergencies the principal holds a (non-expired) grant in, resolved
 * to {id, slug, name, roleIds}. Joins the user's emergency-scoped grants against
 * the active `/emergencies` list (paused/closed emergencies have no slug here and
 * are skipped — a known v1 limitation).
 */
export const getMyEmergencies = cache(async (): Promise<MyEmergencyNav[]> => {
  const me = await getMe();
  if (me == null) return [];
  const { data: emergencies } = await api.GET('/emergencies');
  const byId = new Map((emergencies ?? []).map((e) => [e.id, e]));
  const acc = new Map<string, MyEmergencyNav>();
  const now = Date.now();

  for (const g of me.grants ?? []) {
    if (g.scopeType !== 'emergency' || g.scopeId == null) continue;
    if (g.expiresAt != null && new Date(g.expiresAt).getTime() <= now) continue;
    const e = byId.get(g.scopeId);
    if (e?.slug == null) continue;
    const entry =
      acc.get(g.scopeId) ?? { id: e.id, slug: e.slug, name: e.name, roleIds: [] };
    if (!entry.roleIds.includes(g.roleId)) entry.roleIds.push(g.roleId);
    acc.set(g.scopeId, entry);
  }

  return [...acc.values()];
});

/** Everything the dashboard shell needs in one cached call. */
export const getNavContext = cache(async () => {
  const [me, roles, myEmergencies, notificationUnread] = await Promise.all([
    getMe(),
    getRoles(),
    getMyEmergencies(),
    getNotificationUnread(),
  ]);
  return { me, roles, myEmergencies, notificationUnread };
});

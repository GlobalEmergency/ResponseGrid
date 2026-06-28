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

'use server';

import { getToken, clearToken, authHeaders } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';

export interface UserListItem {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  roles: string[];
  grantCount: number;
}

export interface UserGrant {
  id: string;
  roleId: string;
  scopeType: string;
  scopeId: string | null;
  scopeName: string | null;
  grantedByPrincipalId: string | null;
  grantedAt: string;
  expiresAt: string | null;
}

export interface UserOrganization {
  organizationId: string;
  organizationName: string;
  role: string;
}

export interface UserActivity {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  emergencyId: string | null;
  method: string;
  path: string;
  statusCode: number;
  createdAt: string;
}

export interface UserDetail {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  grants: UserGrant[];
  organizations: UserOrganization[];
  activity: UserActivity[];
}

/**
 * Fetch the admin global list of users (GET /users). On 401 the session is
 * cleared and the user is redirected to login.
 */
export async function fetchUsers(): Promise<UserListItem[]> {
  const token = await getToken();
  if (!token) redirect('/login?next=/panel/administracion/usuarios');

  const { data, error, response } = await api.GET('/users', {
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 401) {
      await clearToken();
      redirect('/login?next=/panel/administracion/usuarios');
    }
    return [];
  }

  return (data ?? []) as UserListItem[];
}

/**
 * Fetch one user's admin detail (GET /users/:id). Returns null on 404 so the
 * page can render a not-found state.
 */
export async function fetchUserDetail(id: string): Promise<UserDetail | null> {
  const token = await getToken();
  if (!token) redirect(`/login?next=/panel/administracion/usuarios/${id}`);

  const { data, error, response } = await api.GET('/users/{id}', {
    params: { path: { id } },
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 401) {
      await clearToken();
      redirect(`/login?next=/panel/administracion/usuarios/${id}`);
    }
    if (response.status === 404) return null;
    return null;
  }

  return (data ?? null) as UserDetail | null;
}

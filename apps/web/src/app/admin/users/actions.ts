'use server';

import { requireSession, authHeaders, redirectToLogin } from '@/lib/auth';
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

export async function fetchUsers(): Promise<UserListItem[]> {
  const token = await requireSession('/admin/users');

  const { data, error, response } = await api.GET('/users', {
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 401) {
      return redirectToLogin('/admin/users');
    }
    return [];
  }

  return (data ?? []) as UserListItem[];
}

// Returns null on 404 so the page can render a not-found state.
export async function fetchUserDetail(id: string): Promise<UserDetail | null> {
  const token = await requireSession(`/admin/users/${id}`);

  const { data, error, response } = await api.GET('/users/{id}', {
    params: { path: { id } },
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 401) {
      return redirectToLogin(`/admin/users/${id}`);
    }
    if (response.status === 404) return null;
    return null;
  }

  return (data ?? null) as UserDetail | null;
}

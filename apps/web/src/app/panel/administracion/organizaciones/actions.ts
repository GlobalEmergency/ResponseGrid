'use server';

import { getToken, clearToken, authHeaders } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';

export type AccreditationStatus = 'global' | 'emergency' | 'none';

export interface OrganizationListItem {
  id: string;
  name: string;
  type: string;
  taxId: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  verificationLevel: string;
  memberCount: number;
  accreditationStatus: AccreditationStatus;
}

export interface OrganizationMember {
  userId: string;
  email: string;
  name: string;
  role: 'owner' | 'member';
}

export interface OrganizationServiceAccount {
  id: string;
  name: string;
  createdAt: string;
  keyCount: number;
  activeKeyCount: number;
}

export interface OrganizationAccreditation {
  id: string;
  scope: 'global' | { emergencyId: string };
  grantedByUserId: string;
  grantedAt: string;
  evidence: string | null;
}

export interface OrganizationDetail {
  id: string;
  name: string;
  type: string;
  taxId: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  verificationLevel: string;
  createdAt: string;
  accreditationStatus: AccreditationStatus;
  members: OrganizationMember[];
  serviceAccounts: OrganizationServiceAccount[];
  accreditations: OrganizationAccreditation[];
  emergencyIds: string[];
}

/**
 * Fetch the admin global list of organizations (GET /organizations/admin).
 * On 401 the session is cleared and the user is redirected to login.
 */
export async function fetchOrganizations(): Promise<OrganizationListItem[]> {
  const token = await getToken();
  if (!token) redirect('/login?next=/panel/administracion/organizaciones');

  const { data, error, response } = await api.GET('/organizations/admin', {
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 401) {
      await clearToken();
      redirect('/login?next=/panel/administracion/organizaciones');
    }
    return [];
  }

  return (data ?? []) as OrganizationListItem[];
}

/**
 * Fetch one organization's admin detail (GET /organizations/:id).
 * Returns null on 404 so the page can render a not-found state.
 */
export async function fetchOrganizationDetail(
  id: string,
): Promise<OrganizationDetail | null> {
  const token = await getToken();
  if (!token) redirect(`/login?next=/panel/administracion/organizaciones/${id}`);

  const { data, error, response } = await api.GET('/organizations/{id}', {
    params: { path: { id } },
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 401) {
      await clearToken();
      redirect(`/login?next=/panel/administracion/organizaciones/${id}`);
    }
    if (response.status === 404) return null;
    return null;
  }

  // Double-cast via unknown: the runtime shape matches OrganizationDetail, but
  // the generated schema widens the accreditation `scope` union to an object.
  return (data ?? null) as unknown as OrganizationDetail | null;
}

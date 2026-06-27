'use server';

import { getToken, authHeaders } from '@/lib/auth';
import type { components } from '@reliefhub/api-client';

export type AuditEntryDto = components['schemas']['AuditEntryDto'];
export type AuditListResponseDto = components['schemas']['AuditListResponseDto'];

const API_BASE = process.env.API_URL ?? 'http://localhost:3000';

export interface FetchAuditParams {
  emergencyId?: string;
  actorUserId?: string;
  entityType?: string;
  limit?: number;
  offset?: number;
}

export async function fetchAuditEntries(
  params: FetchAuditParams = {},
): Promise<AuditListResponseDto> {
  const token = await getToken();
  if (!token) return { entries: [], total: 0 };

  const query = new URLSearchParams();
  if (params.emergencyId) query.set('emergencyId', params.emergencyId);
  if (params.actorUserId) query.set('actorUserId', params.actorUserId);
  if (params.entityType) query.set('entityType', params.entityType);
  if (params.limit != null) query.set('limit', String(params.limit));
  if (params.offset != null) query.set('offset', String(params.offset));

  const url = `${API_BASE}/audit${query.size > 0 ? `?${query.toString()}` : ''}`;

  const res = await fetch(url, {
    headers: authHeaders(token),
    cache: 'no-store',
  });

  if (!res.ok) return { entries: [], total: 0 };

  const data: unknown = await res.json();
  const result = data as AuditListResponseDto;
  return {
    entries: Array.isArray(result?.entries) ? result.entries : [],
    total: typeof result?.total === 'number' ? result.total : 0,
  };
}

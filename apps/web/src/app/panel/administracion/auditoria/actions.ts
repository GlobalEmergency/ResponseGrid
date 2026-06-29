'use server';

import { getToken, authHeaders } from '@/lib/auth';
import { api } from '@/lib/api';
import type { components } from '@reliefhub/api-client';

export type AuditEntryDto = components['schemas']['AuditEntryDto'];
export type AuditListResponseDto = components['schemas']['AuditListResponseDto'];

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

  const { data, error } = await api.GET('/audit', {
    params: {
      query: {
        emergencyId: params.emergencyId,
        actorUserId: params.actorUserId,
        entityType: params.entityType,
        limit: params.limit,
        offset: params.offset,
      },
    },
    headers: authHeaders(token),
  });

  if (error !== undefined) return { entries: [], total: 0 };

  return {
    entries: Array.isArray(data?.entries) ? data.entries : [],
    total: typeof data?.total === 'number' ? data.total : 0,
  };
}

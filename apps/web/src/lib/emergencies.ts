import { api } from '@/lib/api';
import type { components } from '@reliefhub/api-client';

export type EmergencyViewDto = components['schemas']['EmergencyViewDto'];

/**
 * Fetch a single emergency by its URL slug.
 * Returns null when the slug does not exist (404) or on network error.
 * Must only be called from Server Components or Server Actions.
 */
export async function getEmergencyBySlug(
  slug: string,
): Promise<EmergencyViewDto | null> {
  const { data, error } = await api.GET('/emergencies/by-slug/{slug}', {
    params: { path: { slug } },
  });

  if (error !== undefined || data === undefined) {
    return null;
  }

  return data;
}

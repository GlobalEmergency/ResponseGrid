import createClient from 'openapi-fetch';
import type { paths } from './schema.js';

export type { paths, components } from './schema.js';

/**
 * Factory that returns a fully type-safe HTTP client for the ReliefHub API.
 *
 * @example
 * ```ts
 * const client = createReliefHubClient('http://localhost:3000');
 *
 * const { data, error } = await client.GET(
 *   '/emergencies/{emergencyId}/coordination/queue',
 *   { params: { path: { emergencyId: '123' } } }
 * );
 * ```
 */
export function createReliefHubClient(baseUrl: string) {
  return createClient<paths>({ baseUrl });
}

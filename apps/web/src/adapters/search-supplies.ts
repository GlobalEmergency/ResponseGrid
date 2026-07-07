import { fromSupplyDto, type CatalogueSupply } from '@/domain/supplies/catalogue-supply';
import type { components } from '@responsegrid/api-client';

type SupplyDto = components['schemas']['SupplyDto'];

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const MIN_QUERY = 2;
const DEFAULT_LIMIT = 8;

/**
 * Search the shared supply catalogue (`GET /supplies`) and map results to the
 * domain `CatalogueSupply`. Client-side adapter — the only place the UI knows
 * this endpoint. Returns [] without a request for queries under 2 chars;
 * rejects on network/HTTP errors so the caller can surface them.
 */
export async function searchSupplies(
  query: string,
  opts: { locale: string; limit?: number; signal?: AbortSignal },
): Promise<CatalogueSupply[]> {
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY) return [];

  const params = new URLSearchParams({
    q: trimmed,
    locale: opts.locale,
    limit: String(opts.limit ?? DEFAULT_LIMIT),
  });
  const response = await fetch(`${API_URL}/supplies?${params.toString()}`, {
    ...(opts.signal ? { signal: opts.signal } : {}),
  });
  if (!response.ok) throw new Error(`searchSupplies failed: ${response.status}`);
  const data = (await response.json()) as SupplyDto[];
  return data.map(fromSupplyDto);
}

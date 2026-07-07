import { StockItem } from './stock-item.js';

/**
 * Where a {@link StockItem} sits relative to its lot expiry at a given instant:
 * `no_expiry` (not lot-tracked or no expiry), `expired` (at/after the expiry),
 * `near` (within the near-expiry window) or `ok`.
 */
export type ExpiryStatus = 'no_expiry' | 'ok' | 'near' | 'expired';

export interface ExpiryStatusOptions {
  asOf: Date;
  /** Days ahead that count as "near expiry". Default 30. */
  nearWithinDays?: number;
}

export interface ExpiringWithinOptions {
  asOf: Date;
  /** Size of the look-ahead window in days. */
  withinDays: number;
}

const DAY_MS = 86_400_000;
const DEFAULT_NEAR_DAYS = 30;

/**
 * Expiry visibility over the stock — the proactive companion of FEFO: while
 * `allocateFefo` *consumes* the earliest-expiring stock first, these read-only,
 * deterministic helpers *surface* what has expired (to quarantine/write off) and
 * what expires soon (to prioritize). `asOf` is always explicit (never an
 * internal clock) so the results are testable and reproducible. Items with no
 * lot/expiry and zero-quantity items are ignored.
 */
export function expiryStatusOf(
  item: StockItem,
  options: ExpiryStatusOptions,
): ExpiryStatus {
  const expiresAt = item.expiresAt;
  if (expiresAt === null) return 'no_expiry';
  const asOfMs = options.asOf.getTime();
  const expMs = expiresAt.getTime();
  if (expMs <= asOfMs) return 'expired';
  const nearDays = options.nearWithinDays ?? DEFAULT_NEAR_DAYS;
  if (expMs <= asOfMs + nearDays * DAY_MS) return 'near';
  return 'ok';
}

/** Items already expired at `asOf` (quantity > 0), earliest expiry first. */
export function findExpired(items: StockItem[], asOf: Date): StockItem[] {
  const asOfMs = asOf.getTime();
  return items
    .filter(
      (i) =>
        !i.quantity.isZero() &&
        i.expiresAt !== null &&
        i.expiresAt.getTime() <= asOfMs,
    )
    .sort(byExpiryAsc);
}

/**
 * Items **not yet expired** at `asOf` that expire within the look-ahead window
 * (`asOf < expiresAt ≤ asOf + withinDays`), quantity > 0, earliest expiry first.
 * Already-expired stock is excluded — that is {@link findExpired}'s job.
 */
export function expiringWithin(
  items: StockItem[],
  options: ExpiringWithinOptions,
): StockItem[] {
  const asOfMs = options.asOf.getTime();
  const limitMs = asOfMs + options.withinDays * DAY_MS;
  return items
    .filter((i) => {
      if (i.quantity.isZero() || i.expiresAt === null) return false;
      const e = i.expiresAt.getTime();
      return e > asOfMs && e <= limitMs;
    })
    .sort(byExpiryAsc);
}

/**
 * The most urgent lot-tracked item (quantity > 0) — the earliest expiry,
 * including already-expired stock — or null if none is lot-tracked.
 */
export function nextToExpire(items: StockItem[]): StockItem | null {
  const withExpiry = items
    .filter((i) => !i.quantity.isZero() && i.expiresAt !== null)
    .sort(byExpiryAsc);
  return withExpiry[0] ?? null;
}

/** Earliest expiry first; no-expiry last; ties broken by id for stability. */
function byExpiryAsc(a: StockItem, b: StockItem): number {
  const ax = a.expiresAt;
  const bx = b.expiresAt;
  if (ax === null && bx === null) return 0;
  if (ax === null) return 1;
  if (bx === null) return -1;
  const d = ax.getTime() - bx.getTime();
  if (d !== 0) return d;
  return a.id.value < b.id.value ? -1 : a.id.value > b.id.value ? 1 : 0;
}

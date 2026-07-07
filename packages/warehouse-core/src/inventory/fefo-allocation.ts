import { StockItem } from './stock-item.js';
import { WarehouseId } from './warehouse-id.js';
import { Quantity } from './quantity.js';
import { ScopeId } from '../kernel/index.js';

/** What to fulfil: a quantity of a catalog product within a scope. */
export interface FefoDemand {
  scopeId: ScopeId;
  supplyId: string;
  quantity: Quantity;
  /** Restrict allocation to one warehouse; null/absent = any in the scope. */
  warehouseId?: WarehouseId | null;
}

export interface FefoOptions {
  /**
   * If set, stock whose lot is expired at/before this instant is excluded from
   * allocation (you don't ship expired goods). If absent, nothing is excluded
   * on expiry grounds — the caller decides.
   */
  asOf?: Date;
}

/** One draw of the plan: take `quantity` from `item`. */
export interface AllocationLine {
  item: StockItem;
  quantity: Quantity;
}

export interface AllocationPlan {
  lines: AllocationLine[];
  /** Total drawn across all lines (equals the demand when fully allocated). */
  allocated: Quantity;
  /** Unmet remainder (zero when fully allocated). */
  shortfall: Quantity;
  fullyAllocated: boolean;
}

/**
 * Plans a **FEFO** (first-expired-first-out) allocation: given a demand and a
 * set of candidate {@link StockItem}s (the caller loads them — typically the
 * available stock of the product in the scope/warehouse), it draws greedily
 * from the earliest-expiring stock first until the demand is met, and reports
 * any shortfall.
 *
 * Pure and deterministic: no I/O, no mutation. It does **not** move stock — it
 * returns the draw amounts; the caller turns each {@link AllocationLine} into a
 * {@link StockMovement} (issue/transfer) and applies it. Ordering is by lot
 * expiry ascending (never-expiring stock last), tie-broken by `createdAt` then
 * id so the plan is stable.
 *
 * Candidates are filtered to the demand's scope, `supplyId` and unit (and
 * warehouse if given), skipping empty items and — when `asOf` is set — expired
 * lots.
 */
export function allocateFefo(
  demand: FefoDemand,
  candidates: StockItem[],
  options: FefoOptions = {},
): AllocationPlan {
  const unit = demand.quantity.unit;
  const zero = Quantity.of(0, unit);

  const eligible = candidates
    .filter((item) => isEligible(item, demand, options))
    .sort(compareFefo);

  const lines: AllocationLine[] = [];
  let remaining = demand.quantity;

  for (const item of eligible) {
    if (remaining.isZero()) break;
    const take = min(item.quantity, remaining);
    if (take.isZero()) continue;
    lines.push({ item, quantity: take });
    remaining = remaining.minus(take);
  }

  const allocated = demand.quantity.minus(remaining);
  return {
    lines,
    allocated: allocated.isZero() ? zero : allocated,
    shortfall: remaining,
    fullyAllocated: remaining.isZero(),
  };
}

function isEligible(
  item: StockItem,
  demand: FefoDemand,
  options: FefoOptions,
): boolean {
  if (!item.scopeId.equals(demand.scopeId)) return false;
  if (item.supplyId !== demand.supplyId) return false;
  if (item.unit !== demand.quantity.unit) return false;
  if (item.quantity.isZero()) return false;
  if (
    demand.warehouseId != null &&
    !item.warehouseId.equals(demand.warehouseId)
  ) {
    return false;
  }
  if (options.asOf !== undefined && item.isExpiredAt(options.asOf))
    return false;
  return true;
}

/** FEFO order: earliest expiry first (no-expiry last), then oldest, then id. */
function compareFefo(a: StockItem, b: StockItem): number {
  const ax = a.expiresAt;
  const bx = b.expiresAt;
  if (ax !== null && bx !== null) {
    const d = ax.getTime() - bx.getTime();
    if (d !== 0) return d;
  } else if (ax === null && bx !== null) {
    return 1; // a never expires → after b
  } else if (ax !== null && bx === null) {
    return -1; // b never expires → after a
  }
  const created = a.createdAt.getTime() - b.createdAt.getTime();
  if (created !== 0) return created;
  return a.id.value < b.id.value ? -1 : a.id.value > b.id.value ? 1 : 0;
}

function min(a: Quantity, b: Quantity): Quantity {
  return a.isLessThan(b) ? a : b;
}

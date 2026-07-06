import type { Messages } from '../i18n/messages/es.ts';

type BackendErrorMessages = Messages['backendErrors'];

/**
 * Known backend domain-error messages (#296). The NestJS exception filters
 * (`apps/api/src/contexts/*\/infrastructure/http/*-exception.filter.ts`) return
 * `{ statusCode, message: exception.message }` with no stable error-code
 * field — just the `Error`'s English text, sometimes with an id interpolated
 * in the middle. So we match on a stable substring/prefix of each known
 * message rather than the id-bearing parts.
 *
 * Order matters: the first matching pattern wins.
 */
const KNOWN_BACKEND_ERRORS: readonly {
  pattern: RegExp;
  key: keyof BackendErrorMessages;
}[] = [
  // needs / resources / offers — SupplyLineValidationError
  { pattern: /^SupplyLine name must not be empty/, key: 'supply_name_required' },
  {
    pattern: /^SupplyLine quantity must be a positive integer/,
    key: 'supply_quantity_invalid',
  },
  {
    pattern: /^SupplyLine expiresAt must be a valid/,
    key: 'supply_expiry_invalid',
  },
  // needs — NeedResourceNotInEmergencyError
  { pattern: /does not exist in this emergency/, key: 'resource_not_in_emergency' },
  // offers — TargetNeedNotFoundError / TargetNeedWrongEmergencyError
  { pattern: /^Target need not found/, key: 'target_need_not_found' },
  { pattern: /does not belong to emergency/, key: 'target_need_wrong_emergency' },
  // offers — OfferItemsRequiredError
  {
    pattern: /^An offer must have at least one supply line/,
    key: 'offer_items_required',
  },
  // logistics/capacities — TransportCapacity domain errors
  {
    pattern: /^Transport capacity must declare at least/,
    key: 'capacity_weight_or_volume_required',
  },
  { pattern: /^Capacity \S+ must be greater than 0/, key: 'capacity_amount_invalid' },
  { pattern: /^Area coverage must not be empty/, key: 'coverage_area_required' },
  {
    pattern: /^Capacity window \S+ must be a valid ISO date/,
    key: 'capacity_window_invalid_date',
  },
  { pattern: /must not be after/, key: 'capacity_window_order_invalid' },
];

/**
 * Map a raw backend error message to localized copy, so a form never shows
 * English text (and stray UUIDs) straight from the API (#296). Returns
 * `fallback` — the caller's existing generic "couldn't submit" message —
 * for anything unmapped (including a missing/non-string message), so this
 * is always safe to call with whatever `error.message` the typed client gives.
 */
export function localizeBackendError(
  t: BackendErrorMessages,
  message: unknown,
  fallback: string,
): string {
  if (typeof message !== 'string' || message.trim() === '') return fallback;
  const match = KNOWN_BACKEND_ERRORS.find((entry) => entry.pattern.test(message));
  return match ? t[match.key] : fallback;
}

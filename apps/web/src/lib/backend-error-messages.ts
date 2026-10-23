import type { Messages } from '../i18n/messages/es.ts';

type BackendErrorMessages = Messages['backendErrors'];
type BackendErrorCode = Exclude<keyof BackendErrorMessages, 'generic'>;

/**
 * Known backend domain-error messages (#296, hardened by #348). The NestJS
 * exception filters (`apps/api/src/contexts/*\/infrastructure/http/*-exception.filter.ts`)
 * return `{ statusCode, message, code? }`. `code` (added in #348) is a
 * stable, machine-readable identifier set on the domain error classes
 * themselves — prefer it. This regex table matching a substring/prefix of the
 * English `.message` is now only a **fallback** for the deploy-lag window (web
 * and API roll out separately) and for any error not yet migrated to expose a
 * `code`; keeping it means an untyped, hand-maintained coupling to backend
 * prose that can drift silently, so new backend errors should get a `code`
 * instead of relying on this table.
 *
 * Order matters: the first matching pattern wins.
 */
const KNOWN_BACKEND_ERRORS: readonly {
  pattern: RegExp;
  key: BackendErrorCode;
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

const KNOWN_BACKEND_ERROR_CODES: ReadonlySet<string> = new Set(
  KNOWN_BACKEND_ERRORS.map((entry) => entry.key),
);

function isKnownBackendErrorCode(code: string): code is BackendErrorCode {
  return KNOWN_BACKEND_ERROR_CODES.has(code);
}

function readStringProp(value: unknown, key: string): string | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const prop = (value as Record<string, unknown>)[key];
  return typeof prop === 'string' ? prop : undefined;
}

/**
 * Map a backend error to localized copy, so a form never shows English text
 * (and stray UUIDs) straight from the API (#296). `error` is whatever the
 * typed client gives back for a failed request — safe to call with an
 * `unknown` value, a plain string (treated as the message), or `undefined`.
 *
 * Resolution order (#348): a recognized `.code` wins first (the stable
 * contract); a message-prose match is the fallback. Returns `fallback` — the
 * caller's existing generic "couldn't submit" message — when neither matches.
 */
export function localizeBackendError(
  t: BackendErrorMessages,
  error: unknown,
  fallback: string,
): string {
  const code = readStringProp(error, 'code');
  if (code !== undefined && isKnownBackendErrorCode(code)) {
    return t[code];
  }

  const message = typeof error === 'string' ? error : readStringProp(error, 'message');
  if (message === undefined || message.trim() === '') return fallback;
  const match = KNOWN_BACKEND_ERRORS.find((entry) => entry.pattern.test(message));
  return match ? t[match.key] : fallback;
}

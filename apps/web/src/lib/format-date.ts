/**
 * Deterministic, hydration-safe date formatting (issue #174).
 *
 * The bug: `new Date(iso).toLocaleDateString('es-ES')` (no `timeZone`) formats
 * a timestamp in the *runtime's* zone. During SSR the server (EC2 → UTC) and
 * during hydration the browser (the user's local zone) can resolve a timestamp
 * near midnight to **different calendar days**, so the server HTML and the first
 * client render disagree → React #418 hydration mismatch.
 *
 * The fix: pin a fixed `timeZone` (default `'UTC'`) so the formatted string is
 * identical on server and client regardless of where it runs. This module holds
 * the pure, framework-free logic so it is unit-testable via `node --test`.
 *
 * Where the user's *local* time genuinely matters, render with the
 * `<LocalDate>` atom instead: it emits this deterministic string on the server /
 * first client paint (matching, no mismatch) and only swaps in the local-zone
 * value after mount.
 */

import type { Locale } from '@/i18n';

/** Maps the app locale to the BCP-47 tag used across the date call sites. */
function localeTag(locale: Locale): 'es-ES' | 'en-GB' {
  return locale === 'en' ? 'en-GB' : 'es-ES';
}

/** Default: short numeric date (e.g. "26/6/2026"), no time component. */
const DATE_OPTS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
};

/** Date + 24h time (e.g. "26 jun, 14:32"). */
const DATE_TIME_OPTS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
};

/**
 * Formats an ISO 8601 timestamp deterministically (server === client).
 *
 * @param iso     ISO timestamp string.
 * @param locale  App locale ('es' | 'en'); mapped to es-ES / en-GB.
 * @param opts    `Intl.DateTimeFormatOptions`. The `timeZone` defaults to
 *                'UTC'; pass your own to override (e.g. the emergency's zone).
 *                When omitted entirely, a short numeric date is produced.
 * @returns The localized string, or the raw input if it is not a valid date.
 */
export function formatDate(
  iso: string,
  locale: Locale,
  opts: Intl.DateTimeFormatOptions = DATE_OPTS,
): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  // Always pin a timeZone so the output is runtime-independent.
  const withZone: Intl.DateTimeFormatOptions = {
    timeZone: 'UTC',
    ...opts,
  };
  return date.toLocaleString(localeTag(locale), withZone);
}

/**
 * Convenience for the common "date + 24h time" rendering (e.g. need/report
 * timestamps). Deterministic in UTC.
 */
export function formatDateTime(iso: string, locale: Locale): string {
  return formatDate(iso, locale, DATE_TIME_OPTS);
}

/**
 * Formats a timestamp in the runtime's *local* zone. Intended for client-only
 * rendering after mount (see `<LocalDate>`); do NOT call it during SSR or the
 * first client render or you reintroduce the #418 mismatch.
 */
export function formatDateLocal(
  iso: string,
  locale: Locale,
  opts?: Intl.DateTimeFormatOptions,
): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  // No timeZone → the environment's local zone.
  return opts === undefined
    ? date.toLocaleDateString(localeTag(locale))
    : date.toLocaleString(localeTag(locale), opts);
}

/** The presets, exported so the atom can mirror date-only vs date+time. */
export const DATE_TIME_FORMAT = DATE_TIME_OPTS;

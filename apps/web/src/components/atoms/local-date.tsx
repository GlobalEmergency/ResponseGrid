'use client';

/**
 * LocalDate — hydration-safe timestamp display (issue #174).
 *
 * Renders inside a `<time>` element. To avoid the React #418 mismatch caused by
 * the server (UTC) and the browser (local zone) formatting a near-midnight date
 * to different days, it follows a two-phase strategy:
 *
 *   1. SSR + first client (hydration) render → the **deterministic UTC** string
 *      from `formatDate`/`formatDateTime`. Server HTML and the first client
 *      paint are byte-identical, so hydration matches.
 *   2. Immediately after hydration → re-renders the same instant in the user's
 *      **local** zone, the value they actually want to read.
 *
 * The phase is driven by `useSyncExternalStore`: its server snapshot is `false`
 * (not hydrated) and its client snapshot flips to `true` once mounted, so React
 * renders the UTC text on the server and swaps to local on the client without a
 * `setState`-in-effect cascade. `suppressHydrationWarning` covers the
 * intentional text difference.
 *
 * Locale comes from `LocaleProvider`; the machine-readable ISO is preserved in
 * the `<time dateTime>` attribute for programmatic consumers.
 */

import { useSyncExternalStore } from 'react';
import { useLocale } from '@/i18n/locale-context';
import {
  formatDate,
  formatDateTime,
  formatDateLocal,
  DATE_TIME_FORMAT,
} from '@/lib/format-date';

interface LocalDateProps {
  /** ISO 8601 timestamp string. */
  iso: string;
  /** Include the time component (date + 24h time). Default: date only. */
  withTime?: boolean;
  /**
   * Custom `Intl.DateTimeFormatOptions` for sites with a bespoke format. When
   * set it takes precedence over `withTime`; any `timeZone` is ignored for the
   * post-hydration local render. Omit for the standard date / date+time presets.
   */
  opts?: Intl.DateTimeFormatOptions;
  /** Optional CSS classes forwarded to the <time> element. */
  className?: string;
}

/**
 * Same fields as the shared date+time preset but WITHOUT a pinned timeZone, so
 * the post-hydration render resolves to the browser's local zone.
 */
const DATE_TIME_FORMAT_LOCAL: Intl.DateTimeFormatOptions = {
  day: DATE_TIME_FORMAT.day,
  month: DATE_TIME_FORMAT.month,
  hour: DATE_TIME_FORMAT.hour,
  minute: DATE_TIME_FORMAT.minute,
  hour12: DATE_TIME_FORMAT.hour12,
};

/** Drops `timeZone` so the option set resolves to the runtime's local zone. */
function stripZone(
  opts: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormatOptions {
  const { timeZone: _ignored, ...rest } = opts;
  return rest;
}

// ── Hydration flag via useSyncExternalStore ──────────────────────────────────
// A no-op store whose snapshot is `false` on the server and `true` on the
// client. React renders with the server snapshot during hydration, then
// immediately re-renders with the client snapshot — the canonical "is mounted"
// signal without a setState-in-effect cascade.
const emptySubscribe = (): (() => void) => () => {};
const getClientSnapshot = (): boolean => true;
const getServerSnapshot = (): boolean => false;

function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
}

export function LocalDate({
  iso,
  withTime = false,
  opts,
  className,
}: LocalDateProps) {
  const locale = useLocale();
  const hydrated = useHydrated();

  let text: string;
  if (!hydrated) {
    // SSR + hydration render → deterministic UTC.
    text =
      opts !== undefined
        ? formatDate(iso, locale, opts)
        : withTime
          ? formatDateTime(iso, locale)
          : formatDate(iso, locale);
  } else {
    // After hydration → the user's local zone.
    text =
      opts !== undefined
        ? formatDateLocal(iso, locale, stripZone(opts))
        : withTime
          ? formatDateLocal(iso, locale, DATE_TIME_FORMAT_LOCAL)
          : formatDateLocal(iso, locale);
  }

  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {text}
    </time>
  );
}

'use client';

/**
 * RelativeTime — hydration-safe "last updated" display.
 *
 * Thin wrapper over {@link LocalDate} (issue #174): it renders an absolute
 * "DD MMM, HH:MM" timestamp (e.g. "26 jun, 14:32") deterministically in UTC for
 * SSR / first paint, then swaps to the user's local zone after mount — so there
 * is no server/client hydration mismatch. The machine-readable ISO string is
 * preserved in the `<time dateTime>` attribute by `LocalDate`.
 *
 * Kept as a named component so existing call sites (`isoString` prop) are
 * unchanged.
 */

import { LocalDate } from '@/components/atoms/local-date';

interface RelativeTimeProps {
  /** ISO 8601 timestamp string */
  isoString: string;
  /** Optional CSS classes */
  className?: string;
}

export function RelativeTime({ isoString, className }: RelativeTimeProps) {
  return <LocalDate iso={isoString} withTime className={className} />;
}

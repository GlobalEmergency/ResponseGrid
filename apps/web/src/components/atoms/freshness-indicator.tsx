'use client';

/**
 * Stale = lastVerifiedAt more than 6 hours ago, OR expiresAt less than 2 hours
 * away. Expired needs are excluded from public listings by the backend, so this
 * only needs to handle the stale-but-active case.
 */

import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

interface FreshnessIndicatorProps {
  expiresAt?: string | null;
  lastVerifiedAt?: string | null;
}

function isStale(expiresAt: string | null | undefined, lastVerifiedAt: string | null | undefined): boolean {
  const now = Date.now();

  if (lastVerifiedAt != null) {
    const verifiedMs = new Date(lastVerifiedAt).getTime();
    if (!Number.isNaN(verifiedMs) && now - verifiedMs > SIX_HOURS_MS) {
      return true;
    }
  }

  if (expiresAt != null) {
    const expiresMs = new Date(expiresAt).getTime();
    if (!Number.isNaN(expiresMs) && expiresMs - now < TWO_HOURS_MS) {
      return true;
    }
  }

  return false;
}

export function FreshnessIndicator({ expiresAt, lastVerifiedAt }: FreshnessIndicatorProps) {
  const label = getMessages(useLocale()).ui.freshness_verify;

  if (!isStale(expiresAt, lastVerifiedAt)) {
    return null;
  }

  return (
    <span
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-1.5 rounded-full border border-warning bg-warning-soft px-3 py-0.5 text-xs font-semibold text-warning"
      suppressHydrationWarning
    >
      <span aria-hidden="true">⚠️</span>
      {label}
    </span>
  );
}

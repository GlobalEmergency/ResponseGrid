/**
 * StatusBanner — prominent banner shown when an emergency is paused or closed.
 * Renders nothing when status is 'active'.
 * `t` is optional — falls back to Spanish when omitted.
 */

import type { Messages } from '@/i18n/messages/es';
import { es } from '@/i18n/messages/es';

interface StatusBannerProps {
  status: 'active' | 'paused' | 'closed';
  t?: Messages['status_banner'];
}

export function StatusBanner({ status, t = es.status_banner }: StatusBannerProps) {
  if (status === 'active') return null;

  const isPaused = status === 'paused';

  return (
    <div
      role="alert"
      aria-live="polite"
      className={[
        'flex flex-col gap-1 rounded-card border px-4 py-4',
        isPaused
          ? 'border-warning-dot bg-warning-soft text-warning'
          : 'border-line bg-surface-alt text-muted',
      ].join(' ')}
    >
      <p className="text-base font-bold leading-snug">
        {isPaused ? t.paused_title : t.closed_title}
      </p>
      <p className="text-sm">
        {isPaused ? t.paused_body : t.closed_body}
      </p>
    </div>
  );
}

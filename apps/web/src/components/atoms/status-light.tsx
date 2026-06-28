import type { components } from '@reliefhub/api-client';
import type { Messages } from '@/i18n/messages/es';
import { es } from '@/i18n/messages/es';

type PublicStatus = components['schemas']['ResourceViewDto']['publicStatus'];

interface StatusLightProps {
  status: PublicStatus;
  t?: Messages['status_light'];
  className?: string;
}

const COLOR_MAP: Record<PublicStatus, string> = {
  active: 'bg-success-dot',
  saturated: 'bg-warning-dot',
  paused: 'bg-accent',
  closed: 'bg-danger',
  hidden: 'bg-muted',
};

const LABEL_KEY: Record<PublicStatus, keyof Messages['status_light']> = {
  active: 'active',
  saturated: 'saturated',
  paused: 'paused',
  closed: 'closed',
  hidden: 'hidden',
};

/**
 * StatusLight — compact operational-state indicator for a resource point.
 *
 * Renders as an inline flex row (dot + label) so it composes naturally
 * inside flex containers. Accessible via aria-label on the wrapper.
 * `t` is optional — falls back to Spanish when omitted (used in coordinator pages).
 */
export function StatusLight({
  status,
  t = es.status_light,
  className = '',
}: StatusLightProps) {
  const colorClass = COLOR_MAP[status];
  const label = t[LABEL_KEY[status]] as string;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft ${className}`.trim()}
      aria-label={`${t.aria_prefix} ${label}`}
    >
      <span
        className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${colorClass}`}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

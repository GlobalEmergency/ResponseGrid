import { Badge } from '@/components/atoms/badge';

interface DisputedBadgeProps {
  /** Visible + accessible label, e.g. "En verificación". */
  label: string;
  className?: string;
}

/**
 * DisputedBadge — warning pill shown on a point that several citizens reported
 * as invalid (closed / moved / …). The point stays visible; this signals
 * "in review" without asserting it is closed (a coordinator confirms first).
 */
export function DisputedBadge({ label, className }: DisputedBadgeProps) {
  return (
    <Badge variant="disputed" aria-label={label} className={className}>
      <span aria-hidden="true">⚠️</span>
      {label}
    </Badge>
  );
}

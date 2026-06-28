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
  // The visible label is the accessible name; the emoji is decorative. No
  // aria-label — it would just duplicate the text node.
  return (
    <Badge variant="disputed" className={className}>
      <span aria-hidden="true">⚠️</span>
      {label}
    </Badge>
  );
}

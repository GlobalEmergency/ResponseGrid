/**
 * PriorityBadge — coloured pill for a validated need's priority.
 * Mirrors the VerificationBadge / StatusLight pattern: maps a domain value to a
 * Badge variant and renders a caller-localised label.
 */
import { Badge } from '@/components/atoms/badge';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

interface PriorityBadgeProps {
  priority: Priority;
  /** Localised label, e.g. te.priority_urgent. */
  label: string;
  /** aria prefix, e.g. te.needs_priority_label. */
  ariaPrefix?: string;
  className?: string;
}

const VARIANT_MAP: Record<Priority, 'priority-urgent' | 'priority-high' | 'priority-medium' | 'priority-low'> = {
  urgent: 'priority-urgent',
  high: 'priority-high',
  medium: 'priority-medium',
  low: 'priority-low',
};

export function PriorityBadge({ priority, label, ariaPrefix, className }: PriorityBadgeProps) {
  return (
    <Badge
      variant={VARIANT_MAP[priority]}
      aria-label={ariaPrefix !== undefined ? `${ariaPrefix} ${label}` : label}
      className={className}
    >
      {label}
    </Badge>
  );
}

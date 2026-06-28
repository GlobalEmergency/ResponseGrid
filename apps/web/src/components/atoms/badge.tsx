import type { HTMLAttributes } from 'react';

type BadgeVariant =
  | 'active'
  | 'unverified'
  | 'role-owner'
  | 'role-member'
  | 'verification-official'
  | 'verification-verified'
  | 'offer-open'
  | 'offer-matched'
  | 'offer-fulfilled'
  | 'offer-cancelled'
  | 'priority-urgent'
  | 'priority-high'
  | 'priority-medium'
  | 'priority-low';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant: BadgeVariant;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  active:
    'inline-flex items-center rounded-full border-2 border-danger bg-danger-soft px-3 py-0.5 text-xs font-bold text-danger',
  unverified:
    'inline-flex items-center gap-1.5 rounded-full border border-info-line bg-info-soft px-3 py-1 text-sm font-semibold text-info flex-shrink-0',
  'role-owner':
    'inline-flex items-center rounded-full border border-navy bg-navy px-2.5 py-0.5 text-xs font-semibold text-white',
  'role-member':
    'inline-flex items-center rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs font-semibold text-muted',
  'verification-official':
    'inline-flex items-center gap-1 rounded-full border-2 border-warning bg-warning-soft px-3 py-1 text-sm font-bold text-warning flex-shrink-0',
  'verification-verified':
    'inline-flex items-center gap-1 rounded-full border border-success bg-success-soft px-3 py-1 text-sm font-semibold text-success flex-shrink-0',
  'offer-open':
    'inline-flex items-center rounded-full border border-info-line bg-info-soft px-2.5 py-0.5 text-xs font-semibold text-info',
  'offer-matched':
    'inline-flex items-center rounded-full border border-warning bg-warning-soft px-2.5 py-0.5 text-xs font-semibold text-warning',
  'offer-fulfilled':
    'inline-flex items-center rounded-full border border-success bg-success-soft px-2.5 py-0.5 text-xs font-semibold text-success',
  'offer-cancelled':
    'inline-flex items-center rounded-full border border-line bg-surface-alt px-2.5 py-0.5 text-xs font-semibold text-muted',
  // Need-priority pills (Banda oficial brand)
  'priority-urgent':
    'inline-flex items-center rounded-full bg-danger-soft px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-[0.05em] text-danger',
  'priority-high':
    'inline-flex items-center rounded-full bg-warning-soft px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-[0.05em] text-warning',
  'priority-medium':
    'inline-flex items-center rounded-full bg-official-soft px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-[0.05em] text-navy',
  'priority-low':
    'inline-flex items-center rounded-full bg-line-soft px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-[0.05em] text-muted',
};

export function Badge({ variant, className = '', children, ...props }: BadgeProps) {
  return (
    <span
      {...props}
      className={`${VARIANT_CLASSES[variant]} ${className}`.trim()}
    >
      {children}
    </span>
  );
}

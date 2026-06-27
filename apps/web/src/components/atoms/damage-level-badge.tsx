import type { HTMLAttributes } from 'react';

export type DamageLevel = 'collapsed' | 'severe' | 'moderate';

const LEVEL_CONFIG: Record<DamageLevel, { label: string; className: string; icon: string }> = {
  collapsed: {
    label: 'Colapsada',
    icon: '🔴',
    className:
      'inline-flex items-center gap-1 rounded-full border-2 border-red-700 bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-800',
  },
  severe: {
    label: 'Daño grave',
    icon: '🟠',
    className:
      'inline-flex items-center gap-1 rounded-full border border-orange-500 bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-800',
  },
  moderate: {
    label: 'Daño moderado',
    icon: '🟡',
    className:
      'inline-flex items-center gap-1 rounded-full border border-yellow-500 bg-yellow-50 px-2.5 py-0.5 text-xs font-semibold text-yellow-800',
  },
};

interface DamageLevelBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  level: DamageLevel;
}

export function DamageLevelBadge({ level, className = '', ...props }: DamageLevelBadgeProps) {
  const config = LEVEL_CONFIG[level];
  return (
    <span {...props} className={`${config.className} ${className}`.trim()}>
      <span aria-hidden="true">{config.icon}</span>
      {config.label}
    </span>
  );
}

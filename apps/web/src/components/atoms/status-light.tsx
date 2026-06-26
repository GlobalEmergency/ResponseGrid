import type { components } from '@reliefhub/api-client';

type PublicStatus = components['schemas']['ResourceViewDto']['publicStatus'];

interface StatusLightProps {
  status: PublicStatus;
  className?: string;
}

const CONFIG: Record<
  PublicStatus,
  { colorClass: string; label: string }
> = {
  active: { colorClass: 'bg-green-500', label: 'Operativo' },
  saturated: { colorClass: 'bg-yellow-400', label: 'Saturado' },
  paused: { colorClass: 'bg-orange-500', label: 'En pausa' },
  closed: { colorClass: 'bg-red-500', label: 'Cerrado' },
  hidden: { colorClass: 'bg-gray-400', label: 'Oculto' },
};

/**
 * StatusLight — compact operational-state indicator for a resource point.
 *
 * Renders as an inline flex row (dot + label) so it composes naturally
 * inside flex containers. Accessible via aria-label on the wrapper.
 */
export function StatusLight({ status, className = '' }: StatusLightProps) {
  const { colorClass, label } = CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 ${className}`.trim()}
      aria-label={`Estado operativo: ${label}`}
    >
      <span
        className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${colorClass}`}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

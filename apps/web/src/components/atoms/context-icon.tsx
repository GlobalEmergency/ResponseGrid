import type { ContextType } from '@/lib/navigation';

/**
 * Tinted square badge that identifies a context by type on the personal home.
 * Tint carries type, never state — orange stays reserved for actions/counts.
 * Icons are inline `stroke-current` line SVGs (the repo's icon idiom), so they
 * inherit the tint's text colour. Decorative: `aria-hidden`, the row title
 * carries the meaning.
 */
interface ContextIconProps {
  type: ContextType;
  className?: string;
}

const TINT: Record<ContextType, string> = {
  emergency: 'bg-info-soft text-info',
  point: 'bg-success-soft text-success',
  organization: 'bg-surface-alt text-ink-soft',
  group: 'bg-surface-alt text-ink-soft',
};

const SVG = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

function TypeGlyph({ type }: { type: ContextType }) {
  switch (type) {
    // Emergency — warning triangle.
    case 'emergency':
      return (
        <svg {...SVG}>
          <path d="M12 4 3 19h18L12 4Z" />
          <path d="M12 10v4" />
          <path d="M12 17h.01" />
        </svg>
      );
    // Collection point — warehouse / boxed store.
    case 'point':
      return (
        <svg {...SVG}>
          <path d="M3 9l9-5 9 5v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9Z" />
          <path d="M9 20v-6h6v6" />
        </svg>
      );
    // Organization — building.
    case 'organization':
      return (
        <svg {...SVG}>
          <path d="M5 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16" />
          <path d="M15 21V9h3a1 1 0 0 1 1 1v11" />
          <path d="M9 8h2M9 12h2M9 16h2" />
        </svg>
      );
    // Group / crew — people.
    case 'group':
      return (
        <svg {...SVG}>
          <circle cx="9" cy="8" r="3" />
          <path d="M4 20a5 5 0 0 1 10 0" />
          <path d="M16 5.5a3 3 0 0 1 0 5.8" />
          <path d="M17 15.5a5 5 0 0 1 3 4.5" />
        </svg>
      );
  }
}

export function ContextIcon({ type, className = '' }: ContextIconProps) {
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] ${TINT[type]} ${className}`.trim()}
    >
      <TypeGlyph type={type} />
    </span>
  );
}

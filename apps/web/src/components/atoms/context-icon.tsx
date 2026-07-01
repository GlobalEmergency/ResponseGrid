import type { ContextType } from '@/lib/navigation';

/**
 * Tinted square badge that identifies a context by type on the personal home.
 * Tint carries type, never state — orange stays reserved for actions/counts.
 * Icons are inline `stroke-current` line SVGs (the repo's icon idiom), so they
 * inherit the tint's text colour. Decorative: `aria-hidden`, the row title
 * carries the meaning. `resource` contexts additionally pick their glyph by
 * `resourceType` (the `ResourceViewDto.type` enum) while keeping the shared
 * resource-family tint.
 */
interface ContextIconProps {
  type: ContextType;
  /** Only meaningful when `type === 'resource'` — selects the glyph. */
  resourceType?: string;
  className?: string;
}

const TINT: Record<ContextType, string> = {
  emergency: 'bg-info-soft text-info',
  resource: 'bg-success-soft text-success',
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

// Collection/delivery point — warehouse / boxed store. Shared default for the
// point-like resource types and the fallback for any resourceType we don't
// recognise yet.
function CollectionGlyph() {
  return (
    <svg {...SVG}>
      <path d="M3 9l9-5 9 5v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9Z" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

// Warehouse — wider gabled roof over racked shelves.
function WarehouseGlyph() {
  return (
    <svg {...SVG}>
      <path d="M2 10 12 4l10 6" />
      <path d="M4 10v10h16V10" />
      <path d="M8 20v-6h8v6" />
      <path d="M4 20h16" />
    </svg>
  );
}

// Transport — truck.
function TransportGlyph() {
  return (
    <svg {...SVG}>
      <path d="M3 16V6a1 1 0 0 1 1-1h9v11" />
      <path d="M13 9h4l4 4v3h-8" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </svg>
  );
}

// Supplier — package / box.
function SupplierGlyph() {
  return (
    <svg {...SVG}>
      <path d="M12 3 3 7.5v9L12 21l9-4.5v-9L12 3Z" />
      <path d="M3 7.5 12 12l9-4.5" />
      <path d="M12 12v9" />
    </svg>
  );
}

// Venue — building with location pin.
function VenueGlyph() {
  return (
    <svg {...SVG}>
      <path d="M5 21V6a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v15" />
      <path d="M9 21v-4" />
      <path d="M13 21h8" />
      <circle cx="18" cy="9" r="3" />
      <path d="M18 12v9" />
    </svg>
  );
}

/** Glyph per `ResourceViewDto.type`. Point-like types share the collection glyph. */
function ResourceTypeGlyph({ resourceType }: { resourceType?: string }) {
  switch (resourceType) {
    case 'warehouse':
      return <WarehouseGlyph />;
    case 'transport':
      return <TransportGlyph />;
    case 'supplier':
      return <SupplierGlyph />;
    case 'venue':
      return <VenueGlyph />;
    case 'collection_point':
    case 'delivery_point':
    case 'collection_and_delivery':
    default:
      return <CollectionGlyph />;
  }
}

function TypeGlyph({ type, resourceType }: { type: ContextType; resourceType?: string }) {
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
    // Resource — glyph varies by resourceType (point, warehouse, transport, …).
    case 'resource':
      return <ResourceTypeGlyph resourceType={resourceType} />;
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

export function ContextIcon({ type, resourceType, className = '' }: ContextIconProps) {
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] ${TINT[type]} ${className}`.trim()}
    >
      <TypeGlyph type={type} resourceType={resourceType} />
    </span>
  );
}

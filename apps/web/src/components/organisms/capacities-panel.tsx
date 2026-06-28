import type { components } from '@reliefhub/api-client';
import type { Messages } from '@/i18n/messages/es';
import { Badge } from '@/components/atoms/badge';
import { EmptyState } from '@/components/molecules/empty-state';

type CapacityView = components['schemas']['CapacityViewDto'];
type CapacityMode = CapacityView['mode'];
type CapacityStatus = CapacityView['status'];

const STATUS_BADGE: Record<
  CapacityStatus,
  'offer-open' | 'offer-matched' | 'offer-cancelled'
> = {
  available: 'offer-open',
  reserved: 'offer-matched',
  withdrawn: 'offer-cancelled',
};

interface CapacitiesPanelProps {
  capacities: CapacityView[];
  tc: Messages['coord'];
  listLabel: string;
  emptyTitle: string;
  emptyDescription: string;
}

/**
 * Read-only "Capacidades disponibles" panel (#105's coordinator-visible view):
 * each capacity card shows mode, capacity (peso/volumen), coverage area, window
 * and status. No actions — coordination assigns capacities from the shipment
 * detail drawer, not here.
 */
export function CapacitiesPanel({
  capacities,
  tc,
  listLabel,
  emptyTitle,
  emptyDescription,
}: CapacitiesPanelProps) {
  if (capacities.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const MODE_LABELS: Record<CapacityMode, string> = {
    road: tc.ship_mode_road,
    sea: tc.ship_mode_sea,
    air: tc.ship_mode_air,
  };
  const STATUS_LABELS: Record<CapacityStatus, string> = {
    available: tc.cap_status_available,
    reserved: tc.cap_status_reserved,
    withdrawn: tc.cap_status_withdrawn,
  };

  return (
    <ul className="flex flex-col gap-4" aria-label={listLabel}>
      {capacities.map((c) => {
        const amount = formatAmount(c.capacity);
        const area =
          typeof c.coverage.area === 'string' && c.coverage.area !== ''
            ? c.coverage.area
            : null;
        const window = formatWindow(c.window);
        return (
          <li
            key={c.id}
            className="flex flex-col gap-2 rounded-lg border-2 border-line bg-white p-5"
          >
            <div className="flex w-full items-start justify-between gap-3">
              <span className="text-base font-bold leading-tight text-ink">
                {MODE_LABELS[c.mode]}
              </span>
              <Badge variant={STATUS_BADGE[c.status]}>
                {STATUS_LABELS[c.status]}
              </Badge>
            </div>
            <dl className="flex flex-col gap-1 text-sm text-muted">
              {amount !== '' && (
                <div className="flex gap-2">
                  <dt className="font-semibold text-ink">{tc.cap_field_capacity}</dt>
                  <dd>{amount}</dd>
                </div>
              )}
              {area !== null && (
                <div className="flex gap-2">
                  <dt className="font-semibold text-ink">{tc.cap_field_coverage}</dt>
                  <dd className="break-words">{area}</dd>
                </div>
              )}
              {window !== null && (
                <div className="flex gap-2">
                  <dt className="font-semibold text-ink">{tc.cap_field_window}</dt>
                  <dd>{window}</dd>
                </div>
              )}
            </dl>
          </li>
        );
      })}
    </ul>
  );
}

function formatAmount(
  amount: components['schemas']['CapacityAmountResponseDto'],
): string {
  const parts: string[] = [];
  if (typeof amount.weightKg === 'number') parts.push(`${amount.weightKg} kg`);
  if (typeof amount.volumeM3 === 'number') parts.push(`${amount.volumeM3} m³`);
  return parts.join(' · ');
}

function formatWindow(
  window: components['schemas']['CapacityWindowResponseDto'],
): string | null {
  const from =
    typeof window.from === 'string' ? formatDate(window.from) : null;
  const to = typeof window.to === 'string' ? formatDate(window.to) : null;
  if (from === null && to === null) return null;
  if (from !== null && to !== null) return `${from} → ${to}`;
  return from ?? to;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

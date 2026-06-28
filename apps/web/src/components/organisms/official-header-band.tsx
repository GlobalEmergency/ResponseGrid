/**
 * OfficialHeaderBand — the navy "Banda oficial" header for an emergency landing.
 * Accent overline, emergency name (H1), and an operational-status pill with the
 * last-updated time. Built on the shared HeaderBandShell.
 */
import { HeaderBandShell } from '@/components/molecules/header-band-shell';
import { EmergencyHeaderMenu } from '@/components/molecules/emergency-header-menu';
import { RelativeTime } from '@/components/atoms/relative-time';
import type { Messages } from '@/i18n/messages/es';

type Status = 'active' | 'paused' | 'closed';

interface OfficialHeaderBandProps {
  name: string;
  status: Status;
  updatedAt: string;
  te: Messages['emergency'];
}

const DOT_CLASS: Record<Status, string> = {
  active: 'bg-success-dot',
  paused: 'bg-warning-dot',
  closed: 'bg-white/50',
};

export function OfficialHeaderBand({ name, status, updatedAt, te }: OfficialHeaderBandProps) {
  const statusLabel =
    status === 'active'
      ? te.header_status_active
      : status === 'paused'
        ? te.header_status_paused
        : te.header_status_closed;

  return (
    <HeaderBandShell pb="sm" tight brandSize={22} topRight={<EmergencyHeaderMenu te={te} />}>
      <div className="lg:flex lg:items-end lg:justify-between lg:gap-6">
        <div>
          <p className="mb-1.5 hidden text-[11px] font-bold uppercase tracking-[0.16em] text-accent lg:block">
            {te.header_overline}
          </p>
          <h1 className="font-display text-xl font-extrabold leading-[1.1] tracking-tight lg:text-4xl">
            {name}
          </h1>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-2 lg:mt-0 lg:flex-shrink-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide lg:px-3 lg:py-1 lg:text-xs">
            <span className={`h-2 w-2 rounded-full ${DOT_CLASS[status]}`} aria-hidden="true" />
            {statusLabel}
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-on-navy lg:text-xs">
            <span aria-hidden="true">🕑</span>
            <RelativeTime isoString={updatedAt} />
          </span>
        </div>
      </div>
    </HeaderBandShell>
  );
}

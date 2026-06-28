/**
 * OfficialHeaderBand — the navy "Banda oficial" header for an emergency landing.
 * Accent overline, emergency name (H1), and an operational-status pill with the
 * last-updated time. Built on the shared HeaderBandShell.
 */
import { HeaderBandShell } from '@/components/molecules/header-band-shell';
import { HeaderAccountEntry } from '@/components/molecules/header-account-entry';
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
    <HeaderBandShell pb="lg" accountSlot={<HeaderAccountEntry />}>
      <div className="lg:flex lg:items-end lg:justify-between lg:gap-6">
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
            {te.header_overline}
          </p>
          <h1 className="font-display text-[30px] font-extrabold leading-[1.02] tracking-tight lg:text-4xl">
            {name}
          </h1>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2.5 lg:mt-0 lg:flex-shrink-0">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide">
            <span className={`h-2 w-2 rounded-full ${DOT_CLASS[status]}`} aria-hidden="true" />
            {statusLabel}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-on-navy">
            <span aria-hidden="true">🕑</span>
            <RelativeTime isoString={updatedAt} />
          </span>
        </div>
      </div>
    </HeaderBandShell>
  );
}

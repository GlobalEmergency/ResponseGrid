'use client';

// Both lists stay mounted; the inactive one is hidden with the `hidden`
// attribute so its internal state (pagination, "near me", filters) survives a
// tab switch with no refetch.

import { useId, useState, type ReactNode } from 'react';

type Tab = 'points' | 'needs';

interface EmergencyExplorerProps {
  pointsLabel: string;
  needsLabel: string;
  pointsCount: number;
  needsCount: number;
  pointsSlot: ReactNode;
  needsSlot: ReactNode;
  initialTab?: Tab;
  ariaLabel: string;
}

export function EmergencyExplorer({
  pointsLabel,
  needsLabel,
  pointsCount,
  needsCount,
  pointsSlot,
  needsSlot,
  initialTab = 'points',
  ariaLabel,
}: EmergencyExplorerProps) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const baseId = useId();
  const tabId = (t: Tab) => `${baseId}-tab-${t}`;
  const panelId = (t: Tab) => `${baseId}-panel-${t}`;

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="grid grid-cols-2 gap-1 rounded-full border border-line bg-surface-alt p-1"
      >
        <TabButton
          id={tabId('points')}
          controls={panelId('points')}
          active={tab === 'points'}
          onSelect={() => setTab('points')}
          label={pointsLabel}
          count={pointsCount}
        />
        <TabButton
          id={tabId('needs')}
          controls={panelId('needs')}
          active={tab === 'needs'}
          onSelect={() => setTab('needs')}
          label={needsLabel}
          count={needsCount}
        />
      </div>

      <div
        role="tabpanel"
        id={panelId('points')}
        aria-labelledby={tabId('points')}
        hidden={tab !== 'points'}
      >
        {pointsSlot}
      </div>
      <div
        role="tabpanel"
        id={panelId('needs')}
        aria-labelledby={tabId('needs')}
        hidden={tab !== 'needs'}
      >
        {needsSlot}
      </div>
    </div>
  );
}

interface TabButtonProps {
  id: string;
  controls: string;
  active: boolean;
  onSelect: () => void;
  label: string;
  count: number;
}

function TabButton({ id, controls, active, onSelect, label, count }: TabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-selected={active}
      aria-controls={controls}
      tabIndex={active ? 0 : -1}
      onClick={onSelect}
      className={[
        'flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-1',
        active ? 'bg-navy text-white shadow-sm' : 'text-muted hover:text-ink',
      ].join(' ')}
    >
      <span>{label}</span>
      <span
        className={[
          'inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-bold tabular-nums',
          active ? 'bg-white/20 text-white' : 'bg-white text-muted',
        ].join(' ')}
      >
        {count}
      </span>
    </button>
  );
}

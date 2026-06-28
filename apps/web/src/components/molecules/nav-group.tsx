'use client';

/**
 * NavGroup — an optional heading + a list of NavItems, for the app shell.
 */
import { NavItem, type ResolvedNavItem } from '@/components/atoms/nav-item';

export interface ResolvedNavGroup {
  key: string;
  heading?: string;
  items: ResolvedNavItem[];
}

interface NavGroupProps {
  group: ResolvedNavGroup;
  onNavigate?: () => void;
}

export function NavGroup({ group, onNavigate }: NavGroupProps) {
  return (
    <div className="flex flex-col gap-0.5">
      {group.heading != null && group.heading !== '' ? (
        <h3 className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wide text-on-navy-soft">
          {group.heading}
        </h3>
      ) : null}
      {group.items.map((item) => (
        <NavItem key={item.key} item={item} onNavigate={onNavigate} />
      ))}
    </div>
  );
}

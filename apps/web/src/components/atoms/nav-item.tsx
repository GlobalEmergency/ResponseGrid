'use client';

/**
 * NavItem — a single sidebar/drawer link with active-route highlighting.
 * Labels arrive pre-resolved (the server shell resolves i18n + dynamic names),
 * so this atom only needs the current path. Styled for the navy sidebar.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface ResolvedNavItem {
  key: string;
  href: string;
  label: string;
  badgeCount?: number;
  exact?: boolean;
}

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface NavItemProps {
  item: ResolvedNavItem;
  /** Called after navigation (used by the mobile drawer to close itself). */
  onNavigate?: () => void;
}

export function NavItem({ item, onNavigate }: NavItemProps) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href, item.exact);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={[
        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-white/15 text-white'
          : 'text-on-navy hover:bg-white/10 hover:text-white',
      ].join(' ')}
    >
      <span className="truncate">{item.label}</span>
      {item.badgeCount != null && item.badgeCount > 0 ? (
        <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">
          {item.badgeCount > 99 ? '99+' : item.badgeCount}
        </span>
      ) : null}
    </Link>
  );
}

'use client';

// Labels arrive pre-resolved (the server shell resolves i18n + dynamic names),
// so this atom only needs the current path.
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface ResolvedNavItem {
  key: string;
  href: string;
  label: string;
  badgeCount?: number;
  exact?: boolean;
  children?: ResolvedNavItem[];
}

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Left padding per nesting level — indentation only, no colored side-stripe. */
const INDENT_BY_LEVEL = ['pl-3', 'pl-6', 'pl-9', 'pl-12'] as const;

function indentClass(level: number): string {
  return INDENT_BY_LEVEL[Math.min(level, INDENT_BY_LEVEL.length - 1)];
}

interface NavItemProps {
  item: ResolvedNavItem;
  /** Called after navigation (used by the mobile drawer to close itself). */
  onNavigate?: () => void;
  /** Nesting depth, used to compute indentation for `children`. Root items are level 0. */
  level?: number;
}

export function NavItem({ item, onNavigate, level = 0 }: NavItemProps) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href, item.exact);
  const hasChildren = item.children != null && item.children.length > 0;
  // A child that exactly matches the current path is the true current page —
  // the parent (prefix-matched active for ancestor highlighting) must not
  // also claim aria-current, or the nav emits two "current page" items.
  const childExactActive =
    item.children?.some((c) => c.exact === true && pathname === c.href) ?? false;

  return (
    <div>
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active && !childExactActive ? 'page' : undefined}
        className={[
          'flex items-center gap-2 rounded-lg py-2 pr-3 text-sm font-medium transition-colors',
          indentClass(level),
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
      {hasChildren ? (
        <div className="flex flex-col gap-0.5">
          {item.children?.map((child) => (
            <NavItem key={child.key} item={child} onNavigate={onNavigate} level={level + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

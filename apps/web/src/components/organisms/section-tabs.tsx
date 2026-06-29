'use client';

/**
 * SectionTabs — reusable pill sub-navigation. Mobile-first: a horizontally
 * scrollable row of pills that wraps to multiple lines on wider screens. The
 * active tab is derived from the current path and exposed via
 * `aria-current="page"`. Shared by the coordination and administration areas
 * (each builds its own permission-gated tab list and renders this).
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface SectionTab {
  href: string;
  label: string;
  /** Active-match strategy: exact path vs path prefix (default: prefix). */
  exact?: boolean;
}

interface SectionTabsProps {
  tabs: SectionTab[];
  ariaLabel: string;
}

export function SectionTabs({ tabs, ariaLabel }: SectionTabsProps) {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean): boolean {
    if (exact === true) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav aria-label={ariaLabel} className="-mx-5 lg:mx-0">
      <ul className="flex gap-2 overflow-x-auto px-5 pb-1 lg:flex-wrap lg:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => {
          const active = isActive(tab.href, tab.exact);
          return (
            <li key={tab.href} className="shrink-0">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={[
                  'inline-flex items-center rounded-full border-2 px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-1',
                  active
                    ? 'border-navy bg-navy text-white'
                    : 'border-line text-muted hover:border-navy hover:text-ink',
                ].join(' ')}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

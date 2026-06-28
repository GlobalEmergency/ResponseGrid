'use client';

/**
 * Sub-navigation for the coordination area. Renders one tab per section the
 * principal can act on (permission-gated by the flags the server resolves with
 * {@link resolveEmergencyAccess}). Mobile-first: a horizontally scrollable row
 * of pills that collapses to inline tabs on wider screens. The active tab is
 * derived from the current path and exposed via `aria-current="page"`.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';

export interface CoordinationTabsAccess {
  canVerifyResources: boolean;
  canValidateNeeds: boolean;
  canMatchOffers: boolean;
  canCoordinateLogistics: boolean;
  canCoordinate: boolean;
  canViewAudit: boolean;
}

interface CoordinationTabsProps {
  slug: string;
  access: CoordinationTabsAccess;
}

export function CoordinationTabs({ slug, access }: CoordinationTabsProps) {
  const tc = getMessages(useLocale()).coord;
  const pathname = usePathname();
  const base = `/e/${slug}/coordinacion`;

  const tabs: Array<{ href: string; label: string; exact: boolean }> = [
    { href: base, label: tc.tab_overview, exact: true },
  ];
  if (access.canVerifyResources) {
    tabs.push({ href: `${base}/recursos`, label: tc.tab_resources, exact: false });
  }
  if (access.canValidateNeeds) {
    tabs.push({ href: `${base}/peticiones`, label: tc.tab_needs, exact: false });
  }
  if (access.canMatchOffers) {
    tabs.push({ href: `${base}/ofertas`, label: tc.tab_offers, exact: false });
  }
  if (access.canCoordinateLogistics) {
    tabs.push({ href: `${base}/expediciones`, label: tc.tab_shipments, exact: false });
  }
  if (access.canCoordinate) {
    tabs.push({ href: `${base}/voluntarios`, label: tc.tab_volunteers, exact: false });
    tabs.push({ href: `${base}/reportes`, label: tc.tab_reports, exact: false });
  }
  if (access.canViewAudit) {
    tabs.push({ href: `${base}/actividad`, label: tc.tab_activity, exact: false });
  }

  // A lone "overview" tab means the user has no actionable section — the hub
  // already conveys that, so the sub-nav adds nothing.
  if (tabs.length <= 1) return null;

  function isActive(href: string, exact: boolean): boolean {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav aria-label={tc.tabs_aria} className="-mx-5 lg:mx-0">
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

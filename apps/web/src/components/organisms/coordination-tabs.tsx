'use client';

/**
 * Sub-navigation for the coordination area. Renders one tab per section the
 * principal can act on (permission-gated by the flags the server resolves with
 * {@link resolveEmergencyAccess}). Builds the tab list and delegates rendering
 * to the shared {@link SectionTabs} (mobile-scroll / desktop-wrap pills with an
 * active state derived from the path).
 */
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';
import { SectionTabs, type SectionTab } from '@/components/organisms/section-tabs';

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
  const base = `/e/${slug}/coordinacion`;

  const tabs: SectionTab[] = [{ href: base, label: tc.tab_overview, exact: true }];
  if (access.canVerifyResources) {
    tabs.push({ href: `${base}/recursos`, label: tc.tab_resources });
    tabs.push({ href: `${base}/puntos-en-duda`, label: tc.tab_disputes });
  }
  if (access.canValidateNeeds) {
    tabs.push({ href: `${base}/peticiones`, label: tc.tab_needs });
  }
  if (access.canMatchOffers) {
    tabs.push({ href: `${base}/ofertas`, label: tc.tab_offers });
  }
  if (access.canCoordinateLogistics) {
    tabs.push({ href: `${base}/expediciones`, label: tc.tab_shipments });
  }
  if (access.canCoordinate) {
    tabs.push({ href: `${base}/voluntarios`, label: tc.tab_volunteers });
    tabs.push({ href: `${base}/reportes`, label: tc.tab_reports });
  }
  if (access.canViewAudit) {
    tabs.push({ href: `${base}/actividad`, label: tc.tab_activity });
  }

  // A lone "overview" tab means the user has no actionable section — the hub
  // already conveys that, so the sub-nav adds nothing.
  if (tabs.length <= 1) return null;

  return <SectionTabs tabs={tabs} ariaLabel={tc.tabs_aria} />;
}

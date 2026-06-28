/**
 * SiteHeaderBand — brand navy band for the public Home + content pages. Signed-in
 * viewers get a "Mi panel" bridge into their role-aware dashboard (the nav
 * sidebar/drawer only lives inside the dashboard sections).
 */
import { HeaderBandShell } from '@/components/molecules/header-band-shell';
import { HeaderAccountEntry } from '@/components/molecules/header-account-entry';

export function SiteHeaderBand() {
  return <HeaderBandShell pb="sm" accountSlot={<HeaderAccountEntry />} />;
}

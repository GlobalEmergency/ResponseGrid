/**
 * SiteHeaderBand — brand navy band for the public Home + content pages. Signed-in
 * viewers get a "Mi panel" bridge into their role-aware dashboard (the nav
 * sidebar/drawer only lives inside the dashboard sections); everyone gets an
 * options menu (language + key site links) so the header is consistent with the
 * emergency header and useful on mobile.
 */
import { getT } from '@/i18n/server';
import { HeaderBandShell } from '@/components/molecules/header-band-shell';
import { HeaderAccountEntry } from '@/components/molecules/header-account-entry';
import { HeaderMenu } from '@/components/molecules/header-menu';

export async function SiteHeaderBand() {
  const { t } = await getT();
  const f = t.common.footer;

  return (
    <HeaderBandShell
      pb="sm"
      accountSlot={<HeaderAccountEntry />}
      topRight={
        <HeaderMenu
          ariaLabel={t.common.menu_aria}
          languageLabel={t.common.language}
          links={[
            { href: '/como-funciona', label: f.resources_how },
            { href: '/verificar', label: f.resources_verify },
            { href: '/sobre', label: f.resources_about },
            { href: '/transparencia', label: f.resources_transparency },
          ]}
        />
      }
    />
  );
}

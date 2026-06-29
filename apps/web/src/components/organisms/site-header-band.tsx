import { getT } from '@/i18n/server';
import { HeaderBandShell } from '@/components/molecules/header-band-shell';
import { HeaderAccountEntry } from '@/components/molecules/header-account-entry';
import { HeaderMenu } from '@/components/molecules/header-menu';

export async function SiteHeaderBand() {
  const { t } = await getT();
  const footer = t.common.footer;

  return (
    <HeaderBandShell
      pb="sm"
      accountSlot={<HeaderAccountEntry />}
      topRight={
        <HeaderMenu
          ariaLabel={t.common.menu_aria}
          languageLabel={t.common.language}
          links={[
            { href: '/como-funciona', label: footer.resources_how },
            { href: '/verificar', label: footer.resources_verify },
            { href: '/sobre', label: footer.resources_about },
            { href: '/transparencia', label: footer.resources_transparency },
          ]}
        />
      }
    />
  );
}

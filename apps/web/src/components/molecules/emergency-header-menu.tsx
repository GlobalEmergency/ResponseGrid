'use client';

/**
 * EmergencyHeaderMenu — the "options" menu for the emergency landing header.
 * A thin wrapper over the shared {@link HeaderMenu} with the emergency-specific
 * labels and links.
 */
import { HeaderMenu } from '@/components/molecules/header-menu';
import type { Messages } from '@/i18n/messages/es';

interface EmergencyHeaderMenuProps {
  te: Messages['emergency'];
}

export function EmergencyHeaderMenu({ te }: EmergencyHeaderMenuProps) {
  return (
    <HeaderMenu
      ariaLabel={te.menu_options}
      languageLabel={te.menu_language}
      links={[
        { href: '/como-funciona', label: te.menu_how_it_works },
        { href: '/verificar', label: te.menu_verify },
      ]}
    />
  );
}

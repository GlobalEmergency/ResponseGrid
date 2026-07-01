'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { NavDrawer } from '@/components/molecules/nav-drawer';
import type { PublicLink } from '@/components/molecules/public-menu';

interface MobileNavProps {
  brand: ReactNode;
  account: ReactNode;
  links: PublicLink[];
  requestCta?: { href: string; label: string };
  labels: { openMenu: string; closeMenu: string; navAria: string };
}

export function MobileNav({ brand, account, links, requestCta, labels }: MobileNavProps) {
  return (
    <NavDrawer
      brand={brand}
      account={account}
      openLabel={labels.openMenu}
      closeLabel={labels.closeMenu}
      navAriaLabel={labels.navAria}
    >
      <div className="flex flex-col gap-1 px-1 py-2">
        {requestCta && (
          <Link
            href={requestCta.href}
            className="mb-2 rounded-lg bg-accent-2 px-3 py-2.5 text-center text-sm font-bold text-white hover:bg-accent-2-600"
          >
            {requestCta.label}
          </Link>
        )}
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="rounded-lg px-3 py-2.5 text-sm font-medium text-on-navy hover:bg-white/10 hover:text-white">
            {l.label}
          </Link>
        ))}
      </div>
    </NavDrawer>
  );
}

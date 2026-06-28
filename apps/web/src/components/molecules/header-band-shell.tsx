import type { ReactNode } from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/molecules/brand-logo';
import { LanguageSwitcher } from '@/components/molecules/language-switcher';

type Pb = 'sm' | 'md' | 'lg';
const PB_CLASS: Record<Pb, string> = { sm: 'pb-5', md: 'pb-6', lg: 'pb-7' };

interface HeaderBandShellProps {
  children?: ReactNode;
  /** Bottom padding tier: sm = brand-only band, lg = tall hero band. */
  pb?: Pb;
  /** Brand glyph size in px. */
  brandSize?: number;
  showLanguageSwitcher?: boolean;
}

/**
 * HeaderBandShell — the shared navy "Banda oficial" header chrome: rounded
 * bottom, the brand logo (links home) + ES/EN switch, then page-specific
 * children. Single source of truth for SiteHeaderBand, OfficialHeaderBand and
 * PageHeaderBand.
 */
export function HeaderBandShell({
  children,
  pb = 'md',
  brandSize = 24,
  showLanguageSwitcher = true,
}: HeaderBandShellProps) {
  return (
    <header className={`rounded-b-[28px] bg-navy px-5 pt-6 ${PB_CLASS[pb]} text-white lg:px-8`}>
      <div className={`flex items-center justify-between gap-3${children != null ? ' mb-5' : ''}`}>
        <Link
          href="/"
          aria-label="ResponseGrid"
          className="rounded focus:outline-none focus:ring-2 focus:ring-white/60"
        >
          <BrandLogo size={brandSize} wordmarkClassName="text-base" />
        </Link>
        {showLanguageSwitcher && <LanguageSwitcher tone="dark" />}
      </div>
      {children}
    </header>
  );
}

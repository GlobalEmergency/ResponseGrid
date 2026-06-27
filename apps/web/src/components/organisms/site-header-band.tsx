/**
 * SiteHeaderBand — navy brand band for the public Home directory.
 */
import Link from 'next/link';
import { BrandLogo } from '@/components/molecules/brand-logo';
import { LanguageSwitcher } from '@/components/molecules/language-switcher';

export function SiteHeaderBand() {
  return (
    <header className="rounded-b-[28px] bg-navy px-5 pb-5 pt-6">
      <div className="flex items-center justify-between gap-3 text-white">
        <Link
          href="/"
          aria-label="ResponseGrid"
          className="rounded focus:outline-none focus:ring-2 focus:ring-white/60"
        >
          <BrandLogo size={24} wordmarkClassName="text-base" />
        </Link>
        <LanguageSwitcher tone="dark" />
      </div>
    </header>
  );
}

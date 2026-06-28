/**
 * PageHeaderBand — reusable navy brand band for secondary/inner pages.
 * Brand + language switch, an optional back link, and an optional title/subtitle.
 * Pair it with a `bg-surface` page wrapper for the full "Banda oficial" look.
 */
import Link from 'next/link';
import { BrandLogo } from '@/components/molecules/brand-logo';
import { LanguageSwitcher } from '@/components/molecules/language-switcher';

interface PageHeaderBandProps {
  backHref?: string;
  backLabel?: string;
  title?: string;
  subtitle?: string;
  /** Hide the ES/EN switch (e.g. coordinator-only screens). */
  showLanguageSwitcher?: boolean;
}

export function PageHeaderBand({
  backHref,
  backLabel,
  title,
  subtitle,
  showLanguageSwitcher = true,
}: PageHeaderBandProps) {
  return (
    <header className="rounded-b-[28px] bg-navy px-5 pb-6 pt-6 text-white lg:px-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          href="/"
          aria-label="ResponseGrid"
          className="rounded focus:outline-none focus:ring-2 focus:ring-white/60"
        >
          <BrandLogo size={22} wordmarkClassName="text-[15px]" />
        </Link>
        {showLanguageSwitcher && <LanguageSwitcher tone="dark" />}
      </div>

      {backHref !== undefined && backLabel !== undefined && (
        <Link
          href={backHref}
          className="mb-2 inline-flex items-center gap-1 rounded text-xs font-semibold text-[#a8bbd2] transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60"
        >
          {backLabel}
        </Link>
      )}

      {title !== undefined && (
        <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight lg:text-[28px]">
          {title}
        </h1>
      )}
      {subtitle !== undefined && (
        <p className="mt-1.5 text-sm text-[#b7c6da]">{subtitle}</p>
      )}
    </header>
  );
}

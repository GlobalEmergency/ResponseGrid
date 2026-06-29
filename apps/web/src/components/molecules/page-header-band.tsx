import Link from 'next/link';
import { HeaderBandShell } from '@/components/molecules/header-band-shell';

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
    <HeaderBandShell pb="md" brandSize={22} showLanguageSwitcher={showLanguageSwitcher}>
      {backHref !== undefined && backLabel !== undefined && (
        <Link
          href={backHref}
          className="mb-2 inline-flex items-center gap-1 rounded text-xs font-semibold text-on-navy-soft transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60"
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
        <p className="mt-1.5 text-sm text-on-navy">{subtitle}</p>
      )}
    </HeaderBandShell>
  );
}

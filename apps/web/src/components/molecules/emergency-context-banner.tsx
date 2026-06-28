/**
 * EmergencyContextBanner — a slim strip shown above coordination content so the
 * operator always knows which emergency they're in and can step back out to its
 * public landing. Server component (presentational).
 */
import Link from 'next/link';

interface EmergencyContextBannerProps {
  name: string;
  slug: string;
  contextLabel: string;
  exitLabel: string;
}

export function EmergencyContextBanner({
  name,
  slug,
  contextLabel,
  exitLabel,
}: EmergencyContextBannerProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line bg-surface-alt px-5 py-2.5 lg:px-8">
      <p className="flex items-baseline gap-2 text-sm">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-soft">
          {contextLabel}
        </span>
        <span className="font-display font-bold text-navy">{name}</span>
      </p>
      <Link
        href={`/e/${slug}`}
        className="text-xs font-medium text-muted underline underline-offset-2 transition-colors hover:text-navy"
      >
        {exitLabel}
      </Link>
    </div>
  );
}

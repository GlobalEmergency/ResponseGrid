import type { ReactNode } from 'react';
import Link from 'next/link';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
  badges?: ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel,
  actions,
  badges,
}: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-2">
      {backHref != null && backLabel != null && (
        <Link
          href={backHref}
          className="inline-flex w-fit items-center gap-1 rounded text-sm font-semibold text-muted transition-colors hover:text-navy focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
        >
          <span aria-hidden="true">←</span> {backLabel}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="font-display text-xl font-bold text-navy lg:text-2xl">
            {title}
          </h1>
          {subtitle != null && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
        {actions != null && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
      {badges != null && (
        <div className="flex flex-wrap items-center gap-2">{badges}</div>
      )}
    </header>
  );
}

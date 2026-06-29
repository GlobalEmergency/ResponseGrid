import type { ReactNode } from 'react';
import Link from 'next/link';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Optional back link, rendered above the title. */
  backHref?: string;
  backLabel?: string;
  /** Right-aligned action slot (buttons, etc.). */
  actions?: ReactNode;
  /** Below the title — role badges, status chips, etc. */
  badges?: ReactNode;
}

/**
 * PageHeader — the standard in-shell page header: a navy display title, an
 * optional subtitle and back link, plus a right-aligned actions slot and an
 * optional badges row. Used across the dashboard/panel areas; the navy
 * HeaderBandShell is reserved for standalone public pages. Replaces the ad-hoc
 * inline `<header>` blocks that each page used to define.
 *
 * Server component — no 'use client'.
 */
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

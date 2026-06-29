import type { ReactNode } from 'react';

export type PageWidth = 'form' | 'feed' | 'wide';

/** Desktop max-width per content tier. Mobile is always `max-w-md` (full-bleed
 * with gutters). form = forms/auth, feed = lists/dashboards (default),
 * wide = hubs/tables/admin. */
const WIDTH_CLASS: Record<PageWidth, string> = {
  form: 'lg:max-w-2xl',
  feed: 'lg:max-w-3xl',
  wide: 'lg:max-w-5xl',
};

/** The centering + responsive max-width classes for a content tier. Exposed so
 * standalone pages (which place a flush header band above a padded body) can
 * share the exact same width system without the standard padding/gap. */
export function pageWidthClass(width: PageWidth = 'feed'): string {
  return `mx-auto w-full max-w-md ${WIDTH_CLASS[width]}`;
}

interface PageContainerProps {
  children: ReactNode;
  /** Desktop max-width tier (default: feed). */
  width?: PageWidth;
  /** Extra classes appended to the inner container. */
  className?: string;
}

/**
 * PageContainer — the standard page body wrapper. Mobile-first: full-bleed with
 * comfortable gutters on phones, capped + centered on desktop. Stacks its
 * children with the app's standard vertical rhythm (gap-8). Replaces the
 * hand-rolled `mx-auto w-full max-w-* px-* …` containers across the app so every
 * page shares one responsive width system.
 *
 * Server component — no 'use client'.
 */
export function PageContainer({
  children,
  width = 'feed',
  className = '',
}: PageContainerProps) {
  return (
    <div
      className={`${pageWidthClass(width)} flex flex-col gap-8 px-5 pb-12 pt-6 lg:px-8 ${className}`.trim()}
    >
      {children}
    </div>
  );
}

import type { ReactNode } from 'react';

/**
 * The single canonical page width. Every page — public, auth, dashboard, admin —
 * centers its content at this width with the same gutters, so the whole app
 * shares ONE layout. Exported so the few standalone pages that place a flush
 * header band above their body can reuse the exact same width string.
 */
export const PAGE_WIDTH_CLASS = 'mx-auto w-full max-w-3xl';

interface PageContainerProps {
  children: ReactNode;
  /** Extra classes appended to the inner container. */
  className?: string;
}

/**
 * PageContainer — the one page body wrapper used across the app. Mobile-first:
 * full-bleed with comfortable gutters on phones, capped + centered at the
 * standard width on larger screens, with the app's standard vertical rhythm
 * (gap-8). There are no width variants on purpose: a single width keeps every
 * page identical.
 *
 * Server component — no 'use client'.
 */
export function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <div
      className={`${PAGE_WIDTH_CLASS} flex flex-col gap-8 px-5 pb-12 pt-6 lg:px-8 ${className}`.trim()}
    >
      {children}
    </div>
  );
}

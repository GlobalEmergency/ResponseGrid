import type { ReactNode } from 'react';

type MaxWidth = 'sm' | 'md' | 'xl';

interface PageShellProps {
  children: ReactNode;
  maxWidth?: MaxWidth;
  /** Center vertically (login/signup pages use justify-center). */
  centered?: boolean;
}

const MAX_WIDTH_CLASSES: Record<MaxWidth, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  xl: 'max-w-xl',
};

/**
 * PageShell — the outer page wrapper used by every page.
 * Encapsulates: flex-1, flex centering, bg-white, px-4 py-10,
 * and the inner max-width container with gap.
 *
 * Server component — no 'use client' needed.
 */
export function PageShell({
  children,
  maxWidth = 'xl',
  centered = false,
}: PageShellProps) {
  return (
    <main
      className={`flex-1 flex flex-col items-center ${centered ? 'justify-center' : 'justify-start'} bg-white px-4 py-10`}
    >
      <div
        className={`w-full ${MAX_WIDTH_CLASSES[maxWidth]} flex flex-col gap-10`}
      >
        {children}
      </div>
    </main>
  );
}

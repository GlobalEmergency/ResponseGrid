'use client';

/**
 * DetailDrawer — mobile-first detail overlay for the coordination queues.
 *
 * MOBILE (base classes): a bottom sheet that slides up from the bottom edge,
 * nearly full-height, with a scrollable body and the action button(s) pinned to
 * the bottom (sticky footer) so they stay thumb-reachable.
 *
 * DESKTOP (`sm:`+): the same component becomes a right-side panel ~30rem wide,
 * full height.
 *
 * Mechanics mirror `nav-drawer.tsx`: closes on Escape, backdrop tap and the top
 * close button; locks body scroll while open; `role="dialog" aria-modal`. All
 * interactive targets are ≥44px and there is no hover-only behaviour.
 */
import { useEffect, type ReactNode } from 'react';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';

interface DetailDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Optional badge/status node rendered next to the title. */
  titleAdornment?: ReactNode;
  /** Scrollable detail body. */
  children: ReactNode;
  /** Sticky footer — the action form(s). */
  footer?: ReactNode;
  /** Accessible label for the dialog (defaults to the title). */
  ariaLabel?: string;
}

export function DetailDrawer({
  open,
  onClose,
  title,
  titleAdornment,
  children,
  footer,
  ariaLabel,
}: DetailDrawerProps) {
  const tc = getMessages(useLocale()).coord;

  // Escape to close + lock body scroll while open (external systems → effect).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel ?? title}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label={tc.drawer_close}
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />

      {/* Panel: bottom sheet on mobile, right panel on desktop */}
      <div
        className={[
          'absolute bg-white shadow-xl',
          // Mobile: bottom sheet
          'inset-x-0 bottom-0 flex max-h-[92vh] flex-col rounded-t-2xl',
          // Desktop: right-side panel, full height
          'sm:inset-y-0 sm:right-0 sm:left-auto sm:max-h-none sm:w-[30rem] sm:max-w-full sm:rounded-t-none',
        ].join(' ')}
      >
        {/* Header (sticky) */}
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex min-w-0 flex-col gap-2">
            <h2 className="text-lg font-bold leading-tight text-ink break-words">
              {title}
            </h2>
            {titleAdornment != null && (
              <div className="flex flex-wrap items-center gap-2">
                {titleAdornment}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={tc.drawer_close}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink transition-colors hover:bg-surface focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="6" y1="18" x2="18" y2="6" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {/* Sticky footer (actions) */}
        {footer != null && (
          <div className="sticky bottom-0 border-t border-line bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

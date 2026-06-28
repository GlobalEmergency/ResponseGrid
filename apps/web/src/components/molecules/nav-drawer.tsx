'use client';

/**
 * NavDrawer — the mobile top bar (brand + hamburger) and the slide-in drawer it
 * toggles. The nav content, brand and account block are passed in pre-rendered
 * by the server shell (the same nodes the desktop sidebar uses). The drawer
 * closes on Escape, backdrop click, the close button, and on any click inside
 * the nav (which covers link taps). Hidden at lg+.
 */
import { useState, useEffect, type ReactNode } from 'react';

interface NavDrawerProps {
  brand: ReactNode;
  children: ReactNode;
  account: ReactNode;
  openLabel: string;
  closeLabel: string;
  navAriaLabel: string;
}

export function NavDrawer({
  brand,
  children,
  account,
  openLabel,
  closeLabel,
  navAriaLabel,
}: NavDrawerProps) {
  const [open, setOpen] = useState(false);

  // Escape to close while open (subscribes to an external system — no setState in body).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="lg:hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between bg-navy px-4 py-3 text-white">
        {brand}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={openLabel}
          aria-expanded={open}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      {/* Backdrop + sliding panel */}
      {open ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={navAriaLabel}>
          <button
            type="button"
            aria-label={closeLabel}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-navy shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 text-white">
              {brand}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={closeLabel}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="6" y1="18" x2="18" y2="6" />
                </svg>
              </button>
            </div>
            {/* Close on any tap inside the nav (covers link navigation). */}
            <nav
              aria-label={navAriaLabel}
              onClick={() => setOpen(false)}
              className="flex-1 overflow-y-auto px-2 py-2"
            >
              {children}
            </nav>
            <div className="pb-3">{account}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

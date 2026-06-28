'use client';

/**
 * EmergencyHeaderMenu — a compact "options" menu for the emergency header.
 *
 * Collapses the header chrome (language switch + a couple of site links) behind
 * a single button so the navy band can stay small on mobile. Renders a white
 * dropdown anchored to the button; closes on outside click or Escape.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { LanguageSwitcher } from '@/components/molecules/language-switcher';
import type { Messages } from '@/i18n/messages/es';

interface EmergencyHeaderMenuProps {
  te: Messages['emergency'];
}

export function EmergencyHeaderMenu({ te }: EmergencyHeaderMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current !== null && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={te.menu_options}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/25 text-white transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/60"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path
            d="M4 7h16M4 12h16M4 17h16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-[1200] mt-2 w-56 origin-top-right rounded-xl border border-line bg-white p-2 text-ink shadow-xl"
        >
          <p className="px-2 pt-1 text-[11px] font-bold uppercase tracking-wide text-muted-soft">
            {te.menu_language}
          </p>
          <div className="px-2 pb-2 pt-1.5">
            <LanguageSwitcher tone="light" />
          </div>
          <div className="my-1 border-t border-line" />
          <MenuLink href="/como-funciona" label={te.menu_how_it_works} />
          <MenuLink href="/verificar" label={te.menu_verify} />
        </div>
      )}
    </div>
  );
}

function MenuLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="block rounded-lg px-2 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface focus:bg-surface focus:outline-none"
    >
      {label}
    </Link>
  );
}

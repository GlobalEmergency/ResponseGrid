'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { logoutAction } from '@/app/actions';
import { emergencyAccountLinks } from '@/lib/app-bar-context';

interface AccountControlProps {
  user: { name: string; email: string; isAdmin: boolean } | null;
  slug?: string;
  unreadCount: number;
  loginHref: string;
  t: {
    login: string; account_aria: string; section_emergency: string;
    my_points: string; my_volunteering: string; my_shipments: string;
    notifications: string; notifications_with_count: string;
    my_panel: string; logout: string; admin: string;
  };
}

const itemClass =
  'flex items-center justify-between gap-2 px-3 py-2 text-sm text-ink hover:bg-surface-alt focus:outline-none focus:bg-surface-alt';

export function AccountControl({ user, slug, unreadCount, loginHref, t }: AccountControlProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (user === null) {
    return (
      <Link
        href={loginHref}
        className="inline-flex items-center rounded-lg border border-white/35 px-3.5 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/60"
      >
        {t.login}
      </Link>
    );
  }

  const initial = (user.name || user.email || '?').trim().charAt(0).toUpperCase();
  const links = emergencyAccountLinks(slug);
  const labelFor = (k: 'my_points' | 'my_volunteering' | 'my_shipments') => t[k];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={t.account_aria}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full focus:outline-none focus:ring-2 focus:ring-white/60"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-[13px] font-bold text-white">
          {initial}
        </span>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-line bg-white shadow-lg"
        >
          <div className="border-b border-line px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>

          {links.length > 0 && (
            <div className="border-b border-line py-1">
              <p className="px-3 pb-1 pt-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-soft">
                {t.section_emergency}
              </p>
              {links.map((l) => (
                <Link key={l.href} href={l.href} role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
                  {labelFor(l.labelKey)}
                </Link>
              ))}
            </div>
          )}

          <div className="border-b border-line py-1">
            <Link href="/panel/notificaciones" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
              <span>{t.notifications}</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-accent px-1.5 text-[11px] font-bold text-white">{unreadCount}</span>
              )}
            </Link>
            <Link href="/panel" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
              <span>{t.my_panel}</span>
              {user.isAdmin && (
                <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                  {t.admin}
                </span>
              )}
            </Link>
          </div>

          <form action={logoutAction}>
            <button type="submit" role="menuitem" className={`${itemClass} w-full text-danger`}>
              {t.logout}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

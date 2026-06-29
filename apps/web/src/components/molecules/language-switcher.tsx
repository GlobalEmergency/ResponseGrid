'use client';

import { useLocale } from '@/i18n/locale-context';
import { LOCALE_COOKIE } from '@/i18n/index';
import type { Locale } from '@/i18n/index';

function switchLocale(next: Locale) {
  // Max-age: 1 year; path=/; SameSite=Lax; no HttpOnly so JS can write it.
  document.cookie = `${LOCALE_COOKIE}=${next}; max-age=${60 * 60 * 24 * 365}; path=/; SameSite=Lax`;
  window.location.reload();
}

interface LanguageSwitcherProps {
  tone?: 'light' | 'dark';
}

export function LanguageSwitcher({ tone = 'light' }: LanguageSwitcherProps) {
  const locale = useLocale();

  const locales: Locale[] = ['es', 'en'];

  return (
    <div
      role="group"
      aria-label={locale === 'en' ? 'Language' : 'Idioma'}
      className="flex items-center gap-1"
    >
      {locales.map((loc) => {
        const isActive = locale === loc;
        const activeClass =
          tone === 'dark'
            ? 'border-white bg-white text-navy cursor-default'
            : 'border-navy bg-navy text-white cursor-default';
        const idleClass =
          tone === 'dark'
            ? 'border-white/30 bg-transparent text-white/80 hover:border-white hover:text-white'
            : 'border-line bg-white text-muted hover:border-line-strong hover:text-ink';
        return (
          <button
            key={loc}
            type="button"
            disabled={isActive}
            onClick={() => { if (!isActive) switchLocale(loc); }}
            aria-pressed={isActive}
            className={[
              'text-xs font-semibold px-2 py-1 rounded border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1',
              tone === 'dark' ? 'focus:ring-white' : 'focus:ring-navy',
              isActive ? activeClass : idleClass,
            ].join(' ')}
          >
            {loc.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}

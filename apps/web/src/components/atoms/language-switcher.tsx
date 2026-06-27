'use client';

/**
 * LanguageSwitcher — atom component.
 *
 * Sets the `rh_locale` cookie and reloads the current page to apply the new locale.
 * Uses a pair of <button> elements (not a <select>) for clarity and accessibility.
 *
 * Visibility: shown on home and emergency landing pages.
 */

import { useLocale } from '@/i18n/locale-context';
import { LOCALE_COOKIE } from '@/i18n/index';
import type { Locale } from '@/i18n/index';

function switchLocale(next: Locale) {
  // Max-age: 1 year; path=/; SameSite=Lax; no HttpOnly so JS can write it.
  document.cookie = `${LOCALE_COOKIE}=${next}; max-age=${60 * 60 * 24 * 365}; path=/; SameSite=Lax`;
  window.location.reload();
}

export function LanguageSwitcher() {
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
        return (
          <button
            key={loc}
            type="button"
            disabled={isActive}
            onClick={() => { if (!isActive) switchLocale(loc); }}
            aria-pressed={isActive}
            className={[
              'text-xs font-semibold px-2 py-1 rounded border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1',
              isActive
                ? 'border-gray-900 bg-gray-900 text-white cursor-default'
                : 'border-gray-300 bg-white text-gray-600 hover:border-gray-600 hover:text-gray-900',
            ].join(' ')}
          >
            {loc.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}

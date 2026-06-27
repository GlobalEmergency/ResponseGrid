/**
 * Lightweight i18n system — no dependencies beyond Next.js cookies().
 *
 * Mechanism:
 *  - Default locale: `es` (no URL prefix — existing routes unchanged).
 *  - Second locale: `en`.
 *  - Locale is stored in the `rh_locale` cookie (1-year max-age, lax, client-readable).
 *  - Server Components read the cookie directly via `getLocale()`.
 *  - Client Components use `useLocale()` from `LocaleProvider`.
 *  - A `LanguageSwitcher` atom sets the cookie and reloads the page.
 */

import { es } from './messages/es';
import { en } from './messages/en';
import type { Messages } from './messages/es';

export type Locale = 'es' | 'en';

export const LOCALES: Locale[] = ['es', 'en'];
export const DEFAULT_LOCALE: Locale = 'es';
export const LOCALE_COOKIE = 'rh_locale';

const MESSAGES: Record<Locale, Messages> = { es, en };

/**
 * Returns the Messages dictionary for the given locale.
 */
export function getMessages(locale: Locale): Messages {
  return MESSAGES[locale];
}

/**
 * Parses an untrusted string into a valid Locale, falling back to default.
 */
export function parseLocale(raw: string | undefined | null): Locale {
  if (raw === 'es' || raw === 'en') return raw;
  return DEFAULT_LOCALE;
}

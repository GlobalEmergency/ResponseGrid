/**
 * Server-side locale helper.
 * Must only be called from Server Components or Server Actions.
 */
import { cookies } from 'next/headers';
import { parseLocale, getMessages, LOCALE_COOKIE } from './index';
import type { Locale } from './index';
import type { Messages } from './messages/es';

/**
 * Reads the locale cookie and returns the active Locale.
 */
export async function getLocale(): Promise<Locale> {
  const jar = await cookies();
  const raw = jar.get(LOCALE_COOKIE)?.value;
  return parseLocale(raw);
}

/**
 * Convenience helper: resolves locale + messages in one call.
 */
export async function getT(): Promise<{ locale: Locale; t: Messages }> {
  const locale = await getLocale();
  return { locale, t: getMessages(locale) };
}

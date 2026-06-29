const SUPPORTED_LOCALES = new Set(['es', 'en']);

export function resolveLocale(
  locale?: string | null,
  acceptLanguage?: string | null,
): string {
  const candidates = [locale, acceptLanguage?.split(',')[0], 'es'];
  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }
    const normalized = candidate
      .trim()
      .toLowerCase()
      .split(';')[0]
      .split('-')[0];
    if (SUPPORTED_LOCALES.has(normalized)) {
      return normalized;
    }
  }
  return 'es';
}

export function localizedText(
  baseEs: string,
  translated: string | null,
  locale: string,
): string {
  if (locale === 'en' && translated && translated.trim().length > 0) {
    return translated;
  }
  return baseEs;
}

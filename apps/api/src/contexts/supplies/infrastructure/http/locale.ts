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

/**
 * Localización multi-idioma de la taxonomía de categorías (#221). A diferencia
 * de `resolveLocale` (limitada a es/en para supplies), aquí NO restringimos el
 * conjunto: `category_translations` puede tener cualquier idioma. Devuelve el
 * subtag primario en minúsculas; por defecto 'es'.
 */
export function parseLocale(
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
    if (normalized) {
      return normalized;
    }
  }
  return 'es';
}

/**
 * Etiqueta localizada de una categoría: gana una traducción explícita del
 * idioma pedido; si no, en→labelEn; en cualquier otro caso, labelEs.
 */
export function localizeCategory(
  category: {
    labelEs: string;
    labelEn: string;
    translations: readonly { locale: string; label: string }[];
  },
  locale: string,
): string {
  const match = category.translations.find((t) => t.locale === locale);
  if (match && match.label.trim().length > 0) {
    return match.label;
  }
  if (locale === 'en') {
    return category.labelEn;
  }
  return category.labelEs;
}

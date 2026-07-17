import { CategoryDefinition } from '@globalemergency/warehouse-core/kernel';

export type CategoryLocale = string;

export function resolveLocale(
  locale?: string | null,
  acceptLanguage?: string | null,
): CategoryLocale {
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
 * Etiqueta de una categoría en el locale pedido (cualquier idioma), con
 * fallback a la etiqueta base `es`. Las traducciones viven en
 * `category_translations`; el `en` está sembrado y el resto lo añade el admin.
 */
export function localizedCategoryText(
  category: CategoryDefinition,
  locale: CategoryLocale,
): string {
  const translated = category.translations?.find(
    (item) => item.locale === locale,
  );
  if (translated && translated.label.trim().length > 0) {
    return translated.label;
  }
  return category.labelEs;
}

import { CategoryDefinition } from '../../domain/category-definition';

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

export function localizedText(
  baseEs: string,
  translated: string | null | undefined,
  locale: string,
): string {
  if (locale === 'en' && translated && translated.trim().length > 0) {
    return translated;
  }
  return baseEs;
}

export function localizedCategoryText(
  category: CategoryDefinition,
  locale: CategoryLocale,
): string {
  const translated = category.translations?.find(
    (item) => item.locale === locale,
  );
  if (translated) {
    return translated.label;
  }
  if (locale === 'en') {
    return category.labelEn;
  }
  return category.labelEs;
}

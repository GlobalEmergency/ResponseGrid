import { CategoryDefinition } from '../../domain/category-definition';

export type CategoryLocale = 'es' | 'en' | string;

export function resolveLocale(
  localeParam?: string,
  acceptLanguage?: string,
): CategoryLocale {
  const raw = (localeParam ?? acceptLanguage ?? 'es')
    .split(',')[0]
    .split(';')[0]
    .trim()
    .toLowerCase();
  const normalized = raw.split('-')[0];
  if (normalized === 'en') return 'en';
  if (normalized === 'es') return 'es';
  return normalized === '' ? 'es' : normalized;
}

export function localizedText(
  category: CategoryDefinition,
  locale: CategoryLocale,
): string {
  const translated = category.translations.find(
    (item) => item.locale === locale,
  );
  if (translated) {
    return translated.label;
  }
  if (locale === 'en') {
    return category.labelEn;
  }
  if (locale === 'es') {
    return category.labelEs;
  }
  return category.labelEs;
}

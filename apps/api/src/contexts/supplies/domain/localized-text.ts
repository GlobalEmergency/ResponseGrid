/**
 * Resuelve un texto localizado a partir de un valor base y un mapa
 * `locale -> texto`, con **fallback al base** cuando no hay traducción para el
 * locale pedido (o está vacía). Puro y agnóstico de idioma: soporta N idiomas
 * sin cablear ninguno. El "base" es la fuente de la verdad canónica (`es`):
 * el nombre del insumo (`supplies.name`) o la etiqueta de categoría
 * (`categories.label_es`).
 */
export function localize(
  base: string,
  translations: Readonly<Record<string, string>>,
  locale: string,
): string {
  const value = translations[locale];
  return value !== undefined && value.trim().length > 0 ? value : base;
}

/**
 * Todas las variantes de un texto (base + traducciones), sin vacíos y sin
 * duplicados. Útil para indexar/buscar en cualquier idioma.
 */
export function allLocalizedVariants(
  base: string,
  translations: Readonly<Record<string, string>>,
): string[] {
  const variants = [base, ...Object.values(translations)]
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return [...new Set(variants)];
}

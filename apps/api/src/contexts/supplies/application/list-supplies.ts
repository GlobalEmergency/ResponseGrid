import { Supply } from '../domain/supply';
import { SupplyAlias } from '../domain/supply-alias';
import { normalizeSupplyText } from '../domain/supply-normalize';
import { SupplyResolver } from '../domain/supply-resolver';
import {
  PublicSupplyRecord,
  SupplyCatalogReadModel,
} from '../domain/ports/supply-catalog.read-model';

export interface SupplyCatalogQuery {
  q?: string | undefined;
  categorySlug?: string | undefined;
  locale: string;
  limit: number;
  offset: number;
}

/**
 * Índice de resolución exacta (nombre canónico es/en, código y alias). Los
 * registros ya son `active`, así que los campos de gestión del agregado se
 * rellenan con placeholders neutros: el resolver solo lee id/nombre/código.
 */
function toSupplyResolver(
  records: readonly PublicSupplyRecord[],
): SupplyResolver {
  const make = (record: PublicSupplyRecord, name: string): Supply =>
    Supply.fromSnapshot({
      id: record.id,
      code: record.code,
      name,
      categorySlug: record.categorySlug,
      defaultUnit: record.defaultUnit,
      attributes: record.attributes,
      variantOfId: record.variantOfId,
      status: 'active',
      registrationNotes: null,
    });

  const supplies = records.flatMap((record) =>
    record.nameEn
      ? [make(record, record.nameEs), make(record, record.nameEn)]
      : [make(record, record.nameEs)],
  );
  const aliases = records.flatMap((record) =>
    record.aliases.map((alias) =>
      SupplyAlias.create({ alias, supplyId: record.id }),
    ),
  );
  return new SupplyResolver(supplies, aliases);
}

export class ListSupplies {
  constructor(private readonly catalog: SupplyCatalogReadModel) {}

  async execute(query: SupplyCatalogQuery): Promise<PublicSupplyRecord[]> {
    const records = await this.catalog.listActive();
    const resolvedLocale = query.locale === 'en' ? 'en' : 'es';
    // El resolver (índice de match exacto por nombre/código/alias) solo hace
    // falta cuando hay término de búsqueda; evitamos construirlo —O(N) objetos—
    // en listados por categoría o sin filtro.
    const normalizedQuery = query.q ? normalizeSupplyText(query.q) : '';
    const exactMatchId = query.q
      ? toSupplyResolver(records).resolve(query.q)
      : null;

    const filtered = records.filter((record) => {
      if (query.categorySlug && record.categorySlug !== query.categorySlug) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      if (exactMatchId && record.id === exactMatchId) {
        return true;
      }
      const searchable = normalizeSupplyText(
        [
          record.code,
          record.nameEs,
          record.nameEn ?? '',
          record.categorySlug,
          record.categoryLabelEs,
          record.categoryLabelEn ?? '',
          ...record.aliases,
        ].join(' '),
      );
      return searchable.includes(normalizedQuery);
    });

    const collator = new Intl.Collator(resolvedLocale, { sensitivity: 'base' });
    const sorted = [...filtered].sort((a, b) => {
      if (exactMatchId) {
        const aExact = a.id === exactMatchId;
        const bExact = b.id === exactMatchId;
        if (aExact !== bExact) {
          return aExact ? -1 : 1;
        }
      }
      const aLabel = resolvedLocale === 'en' && a.nameEn ? a.nameEn : a.nameEs;
      const bLabel = resolvedLocale === 'en' && b.nameEn ? b.nameEn : b.nameEs;
      const labelCompare = collator.compare(aLabel, bLabel);
      if (labelCompare !== 0) {
        return labelCompare;
      }
      return a.code.localeCompare(b.code, 'en');
    });

    return sorted.slice(query.offset, query.offset + query.limit);
  }
}

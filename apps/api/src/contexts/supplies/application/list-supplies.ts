import { Supply } from '../domain/supply';
import { SupplyAlias } from '../domain/supply-alias';
import { normalizeSupplyText } from '../domain/supply-normalize';
import { SupplyResolver } from '../domain/supply-resolver';
import {
  SupplyCatalogRecord,
  SupplyRepository,
} from '../domain/ports/supply.repository';

export interface SupplyCatalogQuery {
  q?: string | undefined;
  categorySlug?: string | undefined;
  locale: string;
  limit: number;
  offset: number;
}

function toSupplyResolver(
  records: readonly SupplyCatalogRecord[],
): SupplyResolver {
  const supplies = records.flatMap((record) => {
    const base = Supply.fromSnapshot({
      id: record.id,
      code: record.code,
      name: record.nameEs,
      categorySlug: record.categorySlug,
      defaultUnit: record.defaultUnit,
      attributes: record.attributes,
      variantOfId: record.variantOfId,
      status: record.status,
      registrationNotes: record.registrationNotes,
    });
    if (!record.nameEn) {
      return [base];
    }
    return [
      base,
      Supply.fromSnapshot({
        id: record.id,
        code: record.code,
        name: record.nameEn,
        categorySlug: record.categorySlug,
        defaultUnit: record.defaultUnit,
        attributes: record.attributes,
        variantOfId: record.variantOfId,
        status: record.status,
        registrationNotes: record.registrationNotes,
      }),
    ];
  });
  const aliases = records.flatMap((record) =>
    record.aliases.map((alias) =>
      SupplyAlias.create({ alias, supplyId: record.id }),
    ),
  );
  return new SupplyResolver(supplies, aliases);
}

export class ListSupplies {
  constructor(private readonly repo: SupplyRepository) {}

  async execute(query: SupplyCatalogQuery): Promise<SupplyCatalogRecord[]> {
    const catalog = await this.repo.loadCatalog();
    const resolvedLocale = query.locale === 'en' ? 'en' : 'es';
    const resolver = toSupplyResolver(catalog);
    const normalizedQuery = query.q ? normalizeSupplyText(query.q) : '';
    const exactMatchId = query.q ? resolver.resolve(query.q) : null;

    const filtered = catalog.filter((record) => {
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
          record.categoryLabelEn,
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

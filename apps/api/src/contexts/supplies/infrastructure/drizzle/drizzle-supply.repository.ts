import { asc, eq } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { Supply } from '../../domain/supply';
import { SupplyAlias } from '../../domain/supply-alias';
import { normalizeSupplyText } from '../../domain/supply-normalize';
import { SupplyResolver } from '../../domain/supply-resolver';
import {
  categoryTranslationsTable,
  categoriesTable,
  supplyAliasesTable,
  supplyTranslationsTable,
  suppliesTable,
} from './schema';
import {
  SupplyCatalogRecord,
  SupplySearchParams,
  SupplyRepository,
} from '../../domain/ports/supply.repository';

export class DrizzleSupplyRepository implements SupplyRepository {
  constructor(private readonly db: Db) {}

  async findById(id: string): Promise<Supply | null> {
    const record = (await this.loadCatalog()).find((item) => item.id === id);
    return record ? this.toSupply(record) : null;
  }

  async findByCode(code: string): Promise<Supply | null> {
    const normalized = code.trim().toLowerCase();
    const record = (await this.loadCatalog()).find(
      (item) => item.code.toLowerCase() === normalized,
    );
    return record ? this.toSupply(record) : null;
  }

  async search(params: SupplySearchParams): Promise<Supply[]> {
    const catalog = await this.loadCatalog();
    const resolver = this.buildResolver(catalog);
    const normalizedQuery = params.query
      ? normalizeSupplyText(params.query)
      : '';
    const exactMatchId = params.query ? resolver.resolve(params.query) : null;

    const filtered = catalog.filter((record) => {
      if (params.categorySlug && record.categorySlug !== params.categorySlug) {
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

    const sorted = [...filtered].sort((a, b) => {
      if (exactMatchId) {
        const aExact = a.id === exactMatchId;
        const bExact = b.id === exactMatchId;
        if (aExact !== bExact) {
          return aExact ? -1 : 1;
        }
      }
      return a.nameEs.localeCompare(b.nameEs, 'es');
    });

    return sorted
      .slice(params.offset, params.offset + params.limit)
      .map((r) => this.toSupply(r));
  }

  async save(_supply: Supply): Promise<void> {
    // ponytail: read-only path for #220; admin write APIs will own persistence.
    throw new Error('Not implemented');
  }

  async loadCatalog(): Promise<SupplyCatalogRecord[]> {
    const [
      supplyRows,
      aliasRows,
      supplyTranslationRows,
      categoryRows,
      categoryTranslationRows,
    ] = await Promise.all([
      this.db.select().from(suppliesTable).orderBy(asc(suppliesTable.name)),
      this.db.select().from(supplyAliasesTable),
      this.db
        .select()
        .from(supplyTranslationsTable)
        .where(eq(supplyTranslationsTable.locale, 'en')),
      this.db.select().from(categoriesTable),
      this.db
        .select()
        .from(categoryTranslationsTable)
        .where(eq(categoryTranslationsTable.locale, 'en')),
    ]);

    const aliasesBySupplyId = new Map<string, string[]>();
    for (const row of aliasRows) {
      const aliases = aliasesBySupplyId.get(row.supplyId) ?? [];
      aliases.push(row.aliasNorm);
      aliasesBySupplyId.set(row.supplyId, aliases);
    }

    const supplyNameEnById = new Map(
      supplyTranslationRows.map((row) => [row.supplyId, row.name]),
    );
    const categoryBySlug = new Map(categoryRows.map((row) => [row.slug, row]));
    const categoryLabelEnBySlug = new Map(
      categoryTranslationRows.map((row) => [row.categorySlug, row.label]),
    );

    return supplyRows.map((row) => {
      const category = categoryBySlug.get(row.categorySlug);
      return {
        id: row.id,
        code: row.code,
        nameEs: row.name,
        nameEn: supplyNameEnById.get(row.id) ?? null,
        categorySlug: row.categorySlug,
        categoryLabelEs: category?.labelEs ?? row.categorySlug,
        categoryLabelEn:
          categoryLabelEnBySlug.get(row.categorySlug) ??
          category?.labelEn ??
          row.categorySlug,
        defaultUnit: row.defaultUnit ?? null,
        attributes: (row.attributes ?? {}) as Record<string, unknown>,
        variantOfId: row.variantOfId ?? null,
        status: row.status as Supply['status'],
        registrationNotes: row.registrationNotes ?? null,
        aliases: aliasesBySupplyId.get(row.id) ?? [],
      };
    });
  }

  private buildResolver(
    records: readonly SupplyCatalogRecord[],
  ): SupplyResolver {
    const supplies = records.map((record) =>
      this.toSupply({
        ...record,
        aliases: record.aliases,
      }),
    );
    const aliases = records.flatMap((record) =>
      record.aliases.map((alias) =>
        SupplyAlias.create({ alias, supplyId: record.id }),
      ),
    );
    return new SupplyResolver(supplies, aliases);
  }

  private toSupply(record: SupplyCatalogRecord): Supply {
    return Supply.fromSnapshot({
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
  }
}

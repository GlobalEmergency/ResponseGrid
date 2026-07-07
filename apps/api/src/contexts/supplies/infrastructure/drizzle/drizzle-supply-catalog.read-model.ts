import { asc, eq } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import {
  PublicSupplyRecord,
  SupplyCatalogReadModel,
} from '@globalemergency/warehouse-core/catalog';
import {
  categoryTranslationsTable,
  categoriesTable,
  supplyAliasesTable,
  supplyTranslationsTable,
  suppliesTable,
} from './schema';

const ACTIVE = 'active';

type SupplyRow = typeof suppliesTable.$inferSelect;
type CategoryRow = typeof categoriesTable.$inferSelect;

/**
 * Lectura del catálogo público. Solo materializa insumos `active` y proyecta
 * exclusivamente campos publicables (sin `status` ni `registrationNotes`).
 *
 * i18n **universal**: carga TODAS las traducciones (no un idioma fijo) y las
 * proyecta como mapas `locale -> texto`. La resolución al idioma pedido (con
 * fallback al base `es`) la hace la capa de aplicación/HTTP, así que añadir un
 * idioma nuevo no requiere tocar código.
 */
export class DrizzleSupplyCatalogReadModel implements SupplyCatalogReadModel {
  constructor(private readonly db: Db) {}

  async listActive(): Promise<PublicSupplyRecord[]> {
    const [
      supplyRows,
      aliasRows,
      supplyTranslationRows,
      categoryRows,
      categoryTranslationRows,
    ] = await Promise.all([
      this.db
        .select()
        .from(suppliesTable)
        .where(eq(suppliesTable.status, ACTIVE))
        .orderBy(asc(suppliesTable.name)),
      this.db.select().from(supplyAliasesTable),
      this.db.select().from(supplyTranslationsTable),
      this.db.select().from(categoriesTable),
      this.db.select().from(categoryTranslationsTable),
    ]);

    const aliasesBySupplyId = new Map<string, string[]>();
    for (const row of aliasRows) {
      const aliases = aliasesBySupplyId.get(row.supplyId) ?? [];
      aliases.push(row.aliasNorm);
      aliasesBySupplyId.set(row.supplyId, aliases);
    }

    const translationsBySupplyId = new Map<string, Record<string, string>>();
    for (const row of supplyTranslationRows) {
      const map = translationsBySupplyId.get(row.supplyId) ?? {};
      map[row.locale] = row.name;
      translationsBySupplyId.set(row.supplyId, map);
    }

    const categoryBySlug = new Map(categoryRows.map((row) => [row.slug, row]));
    const categoryTranslationsBySlug = new Map<
      string,
      Record<string, string>
    >();
    for (const row of categoryTranslationRows) {
      const map = categoryTranslationsBySlug.get(row.categorySlug) ?? {};
      map[row.locale] = row.label;
      categoryTranslationsBySlug.set(row.categorySlug, map);
    }

    return supplyRows.map((row) =>
      this.toRecord(
        row,
        translationsBySupplyId.get(row.id) ?? {},
        categoryBySlug.get(row.categorySlug),
        categoryTranslationsBySlug.get(row.categorySlug) ?? {},
        aliasesBySupplyId.get(row.id) ?? [],
      ),
    );
  }

  private toRecord(
    row: SupplyRow,
    translations: Record<string, string>,
    category: CategoryRow | undefined,
    categoryTranslations: Record<string, string>,
    aliases: string[],
  ): PublicSupplyRecord {
    // La tabla de traducciones de categoría es la fuente principal; sembramos
    // es/en desde las columnas de la categoría como red de seguridad para que
    // esos dos idiomas resuelvan aunque falte una fila.
    const categoryTranslationsWithFallback: Record<string, string> = {
      ...(category ? { es: category.labelEs, en: category.labelEn } : {}),
      ...categoryTranslations,
    };
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      translations,
      categorySlug: row.categorySlug,
      categoryLabel: category?.labelEs ?? row.categorySlug,
      categoryTranslations: categoryTranslationsWithFallback,
      defaultUnit: row.defaultUnit ?? null,
      attributes: (row.attributes ?? {}) as Record<string, unknown>,
      variantOfId: row.variantOfId ?? null,
      aliases,
    };
  }
}

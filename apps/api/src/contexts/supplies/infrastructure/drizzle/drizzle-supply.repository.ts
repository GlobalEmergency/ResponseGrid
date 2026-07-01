import { and, asc, eq, ilike, ne, or, sql, type SQL } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { Supply, SupplyStatus } from '../../domain/supply';
import { SupplyAlias } from '../../domain/supply-alias';
import { AliasConflictError } from '../../domain/supply-errors';
import {
  SupplyListFilter,
  SupplyRepository,
} from '../../domain/ports/supply.repository';
import { suppliesTable, supplyAliasesTable } from './schema';

type SupplyRow = typeof suppliesTable.$inferSelect;

/**
 * Persistencia del agregado `Supply` (escritura / gestión interna). La cara
 * pública del catálogo se sirve aparte vía `SupplyCatalogReadModel`.
 */
export class DrizzleSupplyRepository implements SupplyRepository {
  constructor(private readonly db: Db) {}

  async findById(id: string): Promise<Supply | null> {
    const [row] = await this.db
      .select()
      .from(suppliesTable)
      .where(eq(suppliesTable.id, id))
      .limit(1);
    return row ? this.toSupply(row) : null;
  }

  async findByCode(code: string): Promise<Supply | null> {
    // Búsqueda por código normalizada a mayúsculas (los códigos canónicos son
    // 'INS-NNNN', lo que permite usar el índice único).
    const normalized = code.trim().toUpperCase();
    const [row] = await this.db
      .select()
      .from(suppliesTable)
      .where(eq(suppliesTable.code, normalized))
      .limit(1);
    return row ? this.toSupply(row) : null;
  }

  async save(supply: Supply): Promise<void> {
    const s = supply.toSnapshot();
    const now = new Date();
    await this.db
      .insert(suppliesTable)
      .values({
        id: s.id,
        code: s.code,
        name: s.name,
        status: s.status,
        registrationNotes: s.registrationNotes,
        categorySlug: s.categorySlug,
        defaultUnit: s.defaultUnit,
        attributes: s.attributes,
        variantOfId: s.variantOfId,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: suppliesTable.id,
        set: {
          name: s.name,
          status: s.status,
          registrationNotes: s.registrationNotes,
          categorySlug: s.categorySlug,
          defaultUnit: s.defaultUnit,
          attributes: s.attributes,
          variantOfId: s.variantOfId,
          updatedAt: now,
        },
      });
  }

  async nextSequenceValue(): Promise<number> {
    // nextval devuelve bigint -> string; la secuencia se siembra por encima del
    // máximo sembrado en la migración 0042.
    const result = await this.db.execute<{ value: string }>(
      sql`SELECT nextval('supply_code_seq') AS value`,
    );
    const next = Number(result.rows[0]?.value);
    if (!Number.isInteger(next) || next < 1) {
      throw new Error('Supply code sequence allocation returned no row');
    }
    return next;
  }

  async list(filter: SupplyListFilter): Promise<Supply[]> {
    const conditions: SQL[] = [];
    if (filter.status) {
      conditions.push(eq(suppliesTable.status, filter.status));
    }
    if (filter.categorySlug) {
      conditions.push(eq(suppliesTable.categorySlug, filter.categorySlug));
    }
    const q = filter.q?.trim();
    if (q) {
      const like = `%${q}%`;
      conditions.push(
        or(
          ilike(suppliesTable.code, like),
          ilike(suppliesTable.name, like),
        ) as SQL,
      );
    }
    const rows = await this.db
      .select()
      .from(suppliesTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(suppliesTable.code));
    return rows.map((row) => this.toSupply(row));
  }

  async listAliases(supplyId: string): Promise<SupplyAlias[]> {
    const rows = await this.db
      .select()
      .from(supplyAliasesTable)
      .where(eq(supplyAliasesTable.supplyId, supplyId))
      .orderBy(asc(supplyAliasesTable.aliasNorm));
    return rows.map((r) =>
      SupplyAlias.fromSnapshot({ alias: r.aliasNorm, supplyId: r.supplyId }),
    );
  }

  async addAlias(alias: SupplyAlias): Promise<void> {
    const aliasNorm = SupplyAlias.normalize(alias.alias);
    const [existing] = await this.db
      .select()
      .from(supplyAliasesTable)
      .where(eq(supplyAliasesTable.aliasNorm, aliasNorm))
      .limit(1);
    if (existing) {
      // Idempotente si ya apunta al mismo insumo; conflicto si apunta a otro.
      if (existing.supplyId === alias.supplyId) return;
      throw new AliasConflictError(aliasNorm);
    }
    await this.db
      .insert(supplyAliasesTable)
      .values({ aliasNorm, supplyId: alias.supplyId });
  }

  async removeAlias(aliasNorm: string): Promise<void> {
    await this.db
      .delete(supplyAliasesTable)
      .where(
        eq(supplyAliasesTable.aliasNorm, SupplyAlias.normalize(aliasNorm)),
      );
  }

  async merge(sourceId: string, targetId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      // Mueve los alias de A a B. `alias_norm` es PK global (un alias mapea a un
      // solo insumo), así que A y B nunca comparten alias y el UPDATE no choca.
      await tx
        .update(supplyAliasesTable)
        .set({ supplyId: targetId })
        .where(eq(supplyAliasesTable.supplyId, sourceId));
      // Repunta las variantes hijas de A a B (excluyendo al propio B si era hijo de A).
      await tx
        .update(suppliesTable)
        .set({ variantOfId: targetId, updatedAt: new Date() })
        .where(
          and(
            eq(suppliesTable.variantOfId, sourceId),
            ne(suppliesTable.id, targetId),
          ),
        );
      // Si B era variante de A, ahora B es el canónico y deja de ser variante (se vuelve raíz).
      await tx
        .update(suppliesTable)
        .set({ variantOfId: null, updatedAt: new Date() })
        .where(
          and(
            eq(suppliesTable.id, targetId),
            eq(suppliesTable.variantOfId, sourceId),
          ),
        );
      // Archiva A (no se borra: preserva referencias legadas para #223/#226).
      await tx
        .update(suppliesTable)
        .set({ status: 'archived', updatedAt: new Date() })
        .where(eq(suppliesTable.id, sourceId));
    });
  }

  private toSupply(row: SupplyRow): Supply {
    return Supply.fromSnapshot({
      id: row.id,
      code: row.code,
      name: row.name,
      categorySlug: row.categorySlug,
      defaultUnit: row.defaultUnit ?? null,
      attributes: (row.attributes ?? {}) as Record<string, unknown>,
      variantOfId: row.variantOfId ?? null,
      status: row.status as SupplyStatus,
      registrationNotes: row.registrationNotes ?? null,
    });
  }
}

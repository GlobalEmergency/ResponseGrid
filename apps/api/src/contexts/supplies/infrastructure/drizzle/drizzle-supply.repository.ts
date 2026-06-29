import { eq } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { Supply, SupplyStatus } from '../../domain/supply';
import { SupplyRepository } from '../../domain/ports/supply.repository';
import { suppliesTable } from './schema';

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
    const [row] = await this.db
      .select()
      .from(suppliesTable)
      .where(eq(suppliesTable.code, code.trim()))
      .limit(1);
    return row ? this.toSupply(row) : null;
  }

  save(_supply: Supply): Promise<void> {
    // Read-only para #220; las APIs internas de alta/edición serán las dueñas
    // de la persistencia de escritura.
    return Promise.reject(new Error('SupplyRepository.save not implemented'));
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

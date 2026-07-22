import { and, eq, inArray } from 'drizzle-orm';
import {
  LoadTemplate,
  LoadTemplateId,
} from '@globalemergency/warehouse-core/inventory';
import type {
  LoadTemplateRepository,
  ListLoadTemplatesFilter,
} from '@globalemergency/warehouse-core/inventory';
// ScopeId es del kernel (tenencia genérica), no del módulo inventory.
import { ScopeId } from '@globalemergency/warehouse-core/kernel';
import type { WmsDatabase } from './db.js';
import { loadTemplatesTable, loadTemplateLinesTable } from './schema.js';
import {
  rowsToLoadTemplateSnapshot,
  loadTemplateSnapshotToRow,
  loadTemplateLineToRow,
} from './mappers.js';

/**
 * Adaptador Drizzle/Postgres del puerto {@link LoadTemplateRepository}. El kit
 * es un agregado que posee sus líneas (entidades hijas): se persisten en su
 * propia tabla `wms.load_template_lines` (FK con cascada) y se reconstruye vía
 * `LoadTemplate.fromSnapshot` con el array de líneas.
 *
 * `save` es un upsert del kit + reemplazo total de sus líneas (delete +
 * reinsert) dentro de una transacción: mismo patrón que
 * {@link ./drizzle-warehouse.repository.js} (almacén + zonas) — el reemplazo
 * respeta el invariante de "estado completo del agregado" sin diffear líneas.
 */
export class DrizzleLoadTemplateRepository implements LoadTemplateRepository {
  constructor(private readonly db: WmsDatabase) {}

  async save(template: LoadTemplate): Promise<void> {
    const s = template.toSnapshot();
    await this.db.transaction(async (tx) => {
      await tx
        .insert(loadTemplatesTable)
        .values(loadTemplateSnapshotToRow(s))
        .onConflictDoUpdate({
          target: loadTemplatesTable.id,
          set: {
            code: s.code,
            name: s.name,
            status: s.status,
            updatedAt: s.updatedAt,
          },
        });

      // Reemplazo total de líneas: borra las actuales y reinserta el snapshot.
      await tx
        .delete(loadTemplateLinesTable)
        .where(eq(loadTemplateLinesTable.templateId, s.id));
      if (s.lines.length > 0) {
        await tx
          .insert(loadTemplateLinesTable)
          .values(
            s.lines.map((l) => loadTemplateLineToRow(s.id, s.scopeId, l)),
          );
      }
    });
  }

  async findById(id: LoadTemplateId): Promise<LoadTemplate | null> {
    const [row] = await this.db
      .select()
      .from(loadTemplatesTable)
      .where(eq(loadTemplatesTable.id, id.value))
      .limit(1);
    if (!row) return null;
    return this.hydrate(row);
  }

  async findByCode(
    scopeId: ScopeId,
    code: string,
  ): Promise<LoadTemplate | null> {
    const [row] = await this.db
      .select()
      .from(loadTemplatesTable)
      .where(
        and(
          eq(loadTemplatesTable.scopeId, scopeId.value),
          eq(loadTemplatesTable.code, code),
        ),
      )
      .limit(1);
    if (!row) return null;
    return this.hydrate(row);
  }

  async findByScope(
    scopeId: ScopeId,
    filter: ListLoadTemplatesFilter,
  ): Promise<LoadTemplate[]> {
    const conditions = [eq(loadTemplatesTable.scopeId, scopeId.value)];
    if (filter.status !== undefined) {
      conditions.push(eq(loadTemplatesTable.status, filter.status));
    }
    const rows = await this.db
      .select()
      .from(loadTemplatesTable)
      .where(and(...conditions));
    return this.hydrateMany(rows);
  }

  /** Carga las líneas del kit y reconstruye el agregado (un solo kit). */
  private async hydrate(
    row: typeof loadTemplatesTable.$inferSelect,
  ): Promise<LoadTemplate> {
    const lines = await this.db
      .select()
      .from(loadTemplateLinesTable)
      .where(eq(loadTemplateLinesTable.templateId, row.id));
    return LoadTemplate.fromSnapshot(rowsToLoadTemplateSnapshot(row, lines));
  }

  /**
   * Hidrata varios kits sin N+1: una única consulta de líneas
   * `WHERE template_id IN (<ids>)` y agrupación en memoria por kit, en vez de
   * una consulta de líneas por kit.
   */
  private async hydrateMany(
    rows: (typeof loadTemplatesTable.$inferSelect)[],
  ): Promise<LoadTemplate[]> {
    if (rows.length === 0) return [];

    const ids = rows.map((row) => row.id);
    const lines = await this.db
      .select()
      .from(loadTemplateLinesTable)
      .where(inArray(loadTemplateLinesTable.templateId, ids));

    // Agrupa las líneas por su templateId para el ensamblado por kit.
    const linesByTemplate = new Map<string, (typeof lines)[number][]>();
    for (const line of lines) {
      const bucket = linesByTemplate.get(line.templateId);
      if (bucket) bucket.push(line);
      else linesByTemplate.set(line.templateId, [line]);
    }

    return rows.map((row) =>
      LoadTemplate.fromSnapshot(
        rowsToLoadTemplateSnapshot(row, linesByTemplate.get(row.id) ?? []),
      ),
    );
  }
}

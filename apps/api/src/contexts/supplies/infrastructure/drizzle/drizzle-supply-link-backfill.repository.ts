import { and, inArray, isNull, sql, eq } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { SupplyLineSnapshot } from '@globalemergency/warehouse-core/kernel';
import {
  SupplyLineSource,
  SupplyLinkBackfillRepository,
  SupplyLinkPatch,
  UnlinkedLineGroup,
} from '../../domain/ports/supply-link-backfill.repository';
import { containersTable } from './schema';
import { needItemsTable } from '../../../needs/infrastructure/drizzle/schema';
import { offerItemsTable } from '../../../offers/infrastructure/drizzle/schema';
import { donationIntakeLinesTable } from '../../../offers/infrastructure/drizzle/donation-intake-schema';
import { resourceItemsTable } from '../../../resources/infrastructure/drizzle/schema';

/**
 * Las cuatro tablas relacionales con columna `supply_id` (migración 0045).
 * Comparten estructura por construcción (factory `supplyLineColumns`), así que
 * un único registro sirve a `listUnlinked` y `applyLinks`: añadir la próxima
 * fuente es una entrada aquí + el literal en `SupplyLineSource`, sin clonar
 * bloques en dos métodos.
 */
const LINE_TABLES = [
  ['need_items', needItemsTable],
  ['offer_items', offerItemsTable],
  ['resource_items', resourceItemsTable],
  ['donation_intake_lines', donationIntakeLinesTable],
] as const;

/** Contenedores con alguna línea jsonb aún sin enlazar (clave ausente o null). */
const hasUnlinkedLine = sql`EXISTS (
  SELECT 1 FROM jsonb_array_elements(${containersTable.lines}) AS l
  WHERE (l->>'supplyId') IS NULL
)`;

/**
 * Reenlaza las líneas jsonb de un contenedor: fija `supplyId` en las líneas
 * aún sin enlazar cuyo `name` crudo esté en el mapa. Pura para testearla sin
 * BD; las líneas ya enlazadas nunca se tocan (idempotencia).
 */
export function relinkContainerLines(
  lines: readonly SupplyLineSnapshot[],
  supplyIdByName: ReadonlyMap<string, string>,
): { lines: SupplyLineSnapshot[]; relinked: number } {
  let relinked = 0;
  const next = lines.map((line) => {
    if (line.supplyId != null) return line;
    const supplyId = supplyIdByName.get(line.name);
    if (supplyId === undefined) return line;
    relinked += 1;
    return { ...line, supplyId };
  });
  return { lines: next, relinked };
}

/**
 * Backfill de soft-links sobre las tablas de {@link LINE_TABLES} y sobre las
 * líneas jsonb de `containers.lines`. Las tablas de otros contextos se
 * importan directamente (mismo patrón que identity/metrics): esto es una
 * operación de gobernanza del catálogo que corre por debajo de los agregados,
 * y el guard `supply_id IS NULL` garantiza que nunca pisa un enlace ya hecho.
 * También enlaza líneas de contenedores sellados/expedidos a propósito: el
 * soft-link es metadato de catálogo, no altera el contenido declarado
 * (name/quantity) que congela el sellado.
 */
export class DrizzleSupplyLinkBackfillRepository implements SupplyLinkBackfillRepository {
  constructor(private readonly db: Db) {}

  async listUnlinked(): Promise<UnlinkedLineGroup[]> {
    const perTable = await Promise.all(
      LINE_TABLES.map(async ([source, table]) => {
        const rows = await this.db
          .select({
            name: table.name,
            lines: sql<number>`count(*)::int`,
          })
          .from(table)
          .where(isNull(table.supplyId))
          .groupBy(table.name);
        return rows.map((row): UnlinkedLineGroup => ({
          source,
          name: row.name,
          lines: row.lines,
        }));
      }),
    );

    const containerRows = await this.db
      .select({ lines: containersTable.lines })
      .from(containersTable)
      .where(hasUnlinkedLine);

    const containerCounts = new Map<string, number>();
    for (const row of containerRows) {
      for (const line of row.lines) {
        if (line.supplyId != null) continue;
        containerCounts.set(
          line.name,
          (containerCounts.get(line.name) ?? 0) + 1,
        );
      }
    }

    const groups = perTable.flat();
    for (const [name, lines] of containerCounts) {
      groups.push({ source: 'container_lines', name, lines });
    }
    return groups;
  }

  async applyLinks(patches: readonly SupplyLinkPatch[]): Promise<number> {
    // source -> supplyId -> names: un solo UPDATE por (tabla, insumo) en vez
    // de un round-trip por cada texto distinto.
    const grouped = new Map<SupplyLineSource, Map<string, string[]>>();
    for (const patch of patches) {
      const perSupply =
        grouped.get(patch.source) ?? new Map<string, string[]>();
      const names = perSupply.get(patch.supplyId) ?? [];
      names.push(patch.name);
      perSupply.set(patch.supplyId, names);
      grouped.set(patch.source, perSupply);
    }

    let updated = 0;
    await this.db.transaction(async (tx) => {
      for (const [source, table] of LINE_TABLES) {
        for (const [supplyId, names] of grouped.get(source) ?? []) {
          const result = await tx
            .update(table)
            .set({ supplyId })
            .where(and(inArray(table.name, names), isNull(table.supplyId)));
          updated += result.rowCount ?? 0;
        }
      }

      const containerPatches = grouped.get('container_lines');
      if (containerPatches !== undefined) {
        const supplyIdByName = new Map<string, string>();
        for (const [supplyId, names] of containerPatches) {
          for (const name of names) supplyIdByName.set(name, supplyId);
        }
        // FOR UPDATE: el relink es read-modify-write del jsonb completo; sin
        // bloqueo, un save() concurrente del agregado Container (que también
        // sobrescribe `lines` entero) perdería líneas en silencio. Solo se
        // bloquean los contenedores que de verdad tienen algo que enlazar.
        const nameList = sql.join(
          [...supplyIdByName.keys()].map((name) => sql`${name}`),
          sql`, `,
        );
        const rows = await tx
          .select({ id: containersTable.id, lines: containersTable.lines })
          .from(containersTable)
          .where(
            sql`EXISTS (
              SELECT 1 FROM jsonb_array_elements(${containersTable.lines}) AS l
              WHERE (l->>'supplyId') IS NULL AND (l->>'name') IN (${nameList})
            )`,
          )
          .for('update');
        for (const row of rows) {
          const result = relinkContainerLines(row.lines, supplyIdByName);
          if (result.relinked === 0) continue;
          await tx
            .update(containersTable)
            .set({ lines: result.lines, updatedAt: new Date() })
            .where(eq(containersTable.id, row.id));
          updated += result.relinked;
        }
      }
    });
    return updated;
  }
}

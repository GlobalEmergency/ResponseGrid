import { SupplyCatalogReadModel } from '../domain/ports/supply-catalog.read-model';
import {
  SupplyLineSource,
  SupplyLinkBackfillRepository,
  SupplyLinkPatch,
} from '../domain/ports/supply-link-backfill.repository';
import { normalizeSupplyText } from '../domain/supply-normalize';
import { supplyResolverFromCatalog } from '../domain/supply-resolver';

/** Texto que no casa con el catálogo, agregado por forma normalizada. */
export interface UnmatchedSupplyLineGroup {
  /** Primera variante cruda vista de ese texto (para mostrar al admin). */
  name: string;
  /** Total de líneas sin casar con ese texto (todas las fuentes). */
  lines: number;
  sources: SupplyLineSource[];
  /**
   * true = el texto casa con MÁS de un insumo activo. El remedio no es un
   * alias (nunca desambigua) sino fusionar/renombrar los insumos en conflicto.
   */
  ambiguous: boolean;
}

/** Informe de solo lectura: qué casaría y qué no, sin escribir nada. */
export interface SupplyLinkReport {
  /** Textos distintos que un backfill enlazaría ahora mismo. */
  pendingNames: number;
  pendingLines: number;
  unmatchedLines: number;
  unmatched: UnmatchedSupplyLineGroup[];
}

/** Resultado de una ejecución del backfill. */
export interface SupplyLinkBackfillResult {
  /** Textos distintos que casaron contra el catálogo en esta ejecución. */
  linkedNames: number;
  /** Líneas realmente actualizadas en esta ejecución (0 al re-correr). */
  linkedLines: number;
  unmatchedLines: number;
  unmatched: UnmatchedSupplyLineGroup[];
}

interface Classification {
  patches: SupplyLinkPatch[];
  resolvedNames: number;
  resolvedLines: number;
  unmatched: UnmatchedSupplyLineGroup[];
  unmatchedLines: number;
}

/**
 * Backfill best-effort de los soft-links `supplyId` (#226): resuelve el texto
 * libre de las líneas legacy contra el catálogo maestro activo (nombre es/en,
 * código y alias, vía `SupplyResolver`) y enlaza solo lo que casa sin
 * ambigüedad. Lo no-casado queda como informe para revisión admin — el remedio
 * es dar de alta un alias (o fusionar duplicados si `ambiguous`) y
 * re-ejecutar, nunca forzar el enlace.
 */
export class BackfillSupplyLinks {
  constructor(
    private readonly catalog: SupplyCatalogReadModel,
    private readonly repo: SupplyLinkBackfillRepository,
  ) {}

  /** Informe sin efectos: qué enlazaría un backfill y qué queda sin casar. */
  async report(): Promise<SupplyLinkReport> {
    const c = await this.classify();
    return {
      pendingNames: c.resolvedNames,
      pendingLines: c.resolvedLines,
      unmatchedLines: c.unmatchedLines,
      unmatched: c.unmatched,
    };
  }

  /** Ejecuta el backfill y devuelve el resultado + informe de no-casados. */
  async execute(): Promise<SupplyLinkBackfillResult> {
    const c = await this.classify();
    const linkedLines =
      c.patches.length > 0 ? await this.repo.applyLinks(c.patches) : 0;
    return {
      linkedNames: c.resolvedNames,
      linkedLines,
      unmatchedLines: c.unmatchedLines,
      unmatched: c.unmatched,
    };
  }

  private async classify(): Promise<Classification> {
    const [groups, records] = await Promise.all([
      this.repo.listUnlinked(),
      this.catalog.listActive(),
    ]);
    const resolver = supplyResolverFromCatalog(records);

    const patches: SupplyLinkPatch[] = [];
    const resolvedKeys = new Set<string>();
    let resolvedLines = 0;
    const unmatchedByKey = new Map<string, UnmatchedSupplyLineGroup>();

    for (const group of groups) {
      const supplyId = resolver.resolve(group.name);
      const key = normalizeSupplyText(group.name);
      if (supplyId !== null) {
        patches.push({ source: group.source, name: group.name, supplyId });
        resolvedKeys.add(key);
        resolvedLines += group.lines;
        continue;
      }
      const current = unmatchedByKey.get(key);
      if (current) {
        current.lines += group.lines;
        if (!current.sources.includes(group.source)) {
          current.sources.push(group.source);
        }
      } else {
        unmatchedByKey.set(key, {
          name: group.name,
          lines: group.lines,
          sources: [group.source],
          ambiguous: resolver.isAmbiguous(group.name),
        });
      }
    }

    const unmatched = [...unmatchedByKey.values()].sort(
      (a, b) => b.lines - a.lines || a.name.localeCompare(b.name),
    );
    const unmatchedLines = unmatched.reduce((sum, g) => sum + g.lines, 0);
    return {
      patches,
      resolvedNames: resolvedKeys.size,
      resolvedLines,
      unmatched,
      unmatchedLines,
    };
  }
}

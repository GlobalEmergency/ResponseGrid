import { Supply } from './supply.js';
import { SupplyAlias } from './supply-alias.js';
import { allLocalizedVariants } from './localized-text.js';
import { PublicSupplyRecord } from './ports/supply-catalog.read-model.js';

export class SupplyResolver {
  private readonly index = new Map<string, string | null>();

  constructor(
    supplies: readonly Supply[],
    aliases: readonly SupplyAlias[] = [],
  ) {
    for (const supply of supplies) {
      this.addLabel(supply.name, supply.id);
      this.addLabel(supply.code, supply.id);
    }

    for (const alias of aliases) {
      this.addLabel(alias.alias, alias.supplyId);
    }
  }

  private addLabel(label: string, supplyId: string): void {
    const key = SupplyAlias.normalize(label);
    const current = this.index.get(key);
    if (current === undefined) {
      this.index.set(key, supplyId);
      return;
    }
    if (current !== supplyId) {
      this.index.set(key, null);
    }
  }

  resolve(label: string): string | null {
    const resolved = this.index.get(SupplyAlias.normalize(label));
    return resolved ?? null;
  }

  /**
   * Una etiqueta es ambigua cuando su forma normalizada apunta a más de un
   * insumo. `resolve()` la devuelve como null igual que una desconocida, pero
   * el remedio operativo es distinto: un alias nuevo nunca la desambigua —
   * hay que fusionar (o renombrar) los insumos en conflicto.
   */
  isAmbiguous(label: string): boolean {
    return this.index.get(SupplyAlias.normalize(label)) === null;
  }

  resolveMany(labels: string[]): string[] {
    const resolved = labels
      .map((label) => this.resolve(label))
      .filter((s): s is string => s !== null);
    return [...new Set(resolved)];
  }
}

/**
 * Índice de resolución exacta sobre el catálogo activo (nombre canónico en
 * todos sus idiomas, código y alias). Los registros ya son `active`, así que
 * los campos de gestión del agregado se rellenan con placeholders neutros: el
 * resolver solo lee id/nombre/código. Resolver contra el catálogo activo es
 * deliberado — un insumo fusionado/archivado no debe captar líneas nuevas; su
 * texto sale en el informe de no-casados (#226) para dar de alta un alias.
 */
export function supplyResolverFromCatalog(
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
      scopeId: null,
      nature: null,
    });

  const supplies = records.flatMap((record) =>
    allLocalizedVariants(record.name, record.translations).map((name) =>
      make(record, name),
    ),
  );
  const aliases = records.flatMap((record) =>
    record.aliases.map((alias) =>
      SupplyAlias.create({ alias, supplyId: record.id }),
    ),
  );
  return new SupplyResolver(supplies, aliases);
}

import { Supply } from './supply';
import { SupplyAlias } from './supply-alias';

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

  resolveMany(labels: string[]): string[] {
    const resolved = labels
      .map((label) => this.resolve(label))
      .filter((s): s is string => s !== null);
    return [...new Set(resolved)];
  }
}

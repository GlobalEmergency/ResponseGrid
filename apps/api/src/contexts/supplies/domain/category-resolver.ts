export class CategoryResolver {
  constructor(private readonly aliasMap: Map<string, string>) {}

  private normalize(s: string): string {
    return s
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .trim()
      .replace(/\s+/g, ' ');
  }

  resolve(label: string): string | null {
    return this.aliasMap.get(this.normalize(label)) ?? null;
  }

  resolveMany(labels: string[]): string[] {
    const resolved = labels
      .map((l) => this.resolve(l))
      .filter((s): s is string => s !== null);
    return [...new Set(resolved)];
  }
}

import { CategoryDefinition } from './category-definition.js';
import { UnknownCategoryError } from './category-errors.js';

/**
 * The minimal shape the registry needs from a category: its slug, its parent in
 * the hierarchy (or null at the root) and its optional code prefix. Both
 * {@link CategoryDefinition} and the `categories` table rows are structurally
 * assignable to this.
 */
export interface CategoryNode {
  slug: string;
  parentSlug: string | null;
  codePrefix: string | null;
}

const PREFIX_FALLBACK = 'VAR';

/**
 * A data-driven view of a category taxonomy — the configurable counterpart of
 * the hard-coded {@link Category} enum. Built from the category rows a host
 * loads (the `categories` table), it answers membership, hierarchy and code
 * prefix questions without the closed enum, so categories can be added or
 * re-parented in data.
 *
 * Pure and immutable: it takes a snapshot of the nodes at construction. Ingest
 * is lenient (trusted data — duplicate slugs keep the last, dangling parents
 * just end a walk) so it never rejects existing rows; strict *format*
 * validation of new input is {@link CategorySlug}'s job.
 */
export class CategoryRegistry {
  private readonly bySlug: Map<string, CategoryNode>;

  private constructor(bySlug: Map<string, CategoryNode>) {
    this.bySlug = bySlug;
  }

  static fromNodes(nodes: readonly CategoryNode[]): CategoryRegistry {
    const bySlug = new Map<string, CategoryNode>();
    for (const node of nodes) {
      bySlug.set(node.slug, {
        slug: node.slug,
        parentSlug: node.parentSlug,
        codePrefix: node.codePrefix,
      });
    }
    return new CategoryRegistry(bySlug);
  }

  static fromDefinitions(
    definitions: readonly CategoryDefinition[],
  ): CategoryRegistry {
    return CategoryRegistry.fromNodes(
      definitions.map((d) => ({
        slug: d.slug,
        parentSlug: d.parentSlug,
        codePrefix: d.codePrefix,
      })),
    );
  }

  has(slug: string): boolean {
    return this.bySlug.has(slug);
  }

  get(slug: string): CategoryNode | null {
    return this.bySlug.get(slug) ?? null;
  }

  resolve(slug: string): CategoryNode {
    const node = this.bySlug.get(slug);
    if (node === undefined) throw new UnknownCategoryError(slug);
    return node;
  }

  /** Every slug in the taxonomy, in insertion order. */
  slugs(): string[] {
    return [...this.bySlug.keys()];
  }

  /** The direct parent, or null at a root or when the parent is unknown. */
  parentOf(slug: string): CategoryNode | null {
    const parentSlug = this.bySlug.get(slug)?.parentSlug ?? null;
    return parentSlug !== null ? (this.bySlug.get(parentSlug) ?? null) : null;
  }

  /** Direct children of a slug, in insertion order. */
  childrenOf(slug: string): CategoryNode[] {
    return [...this.bySlug.values()].filter((n) => n.parentSlug === slug);
  }

  /** Top-level categories (no parent, or a parent that isn't in the registry). */
  roots(): CategoryNode[] {
    return [...this.bySlug.values()].filter(
      (n) => n.parentSlug === null || !this.bySlug.has(n.parentSlug),
    );
  }

  /** Ancestors from the nearest parent up to the root (cycle-safe). */
  ancestorsOf(slug: string): CategoryNode[] {
    const chain: CategoryNode[] = [];
    const visited = new Set<string>([slug]);
    let current = this.bySlug.get(slug)?.parentSlug ?? null;
    while (current !== null && !visited.has(current)) {
      visited.add(current);
      const node = this.bySlug.get(current);
      if (node === undefined) break;
      chain.push(node);
      current = node.parentSlug;
    }
    return chain;
  }

  /**
   * The code prefix for a slug: its own `codePrefix`, else the nearest
   * ancestor's, else `VAR`. Cycle-safe. Data-driven equivalent of the free
   * `getCategoryPrefix` helper, sharing its walk over the hierarchy.
   */
  prefixFor(slug: string): string {
    const visited = new Set<string>();
    let current: string | null = slug;
    while (current !== null && !visited.has(current)) {
      visited.add(current);
      const node = this.bySlug.get(current);
      if (node?.codePrefix) return node.codePrefix;
      current = node?.parentSlug ?? null;
    }
    return PREFIX_FALLBACK;
  }
}

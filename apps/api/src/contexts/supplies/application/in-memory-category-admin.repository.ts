import { CategoryRecord } from '../domain/category-record';
import {
  CategoryAdminRepository,
  CategoryWriteInput,
} from '../domain/ports/category-admin.repository';

/**
 * Repo admin en memoria para tests de los casos de uso/controller de
 * categorías. Persistencia "tonta" (sin invariantes de negocio), igual que el
 * adaptador real: las reglas las prueban los casos de uso.
 */
export class InMemoryCategoryAdminRepository implements CategoryAdminRepository {
  private readonly bySlug = new Map<string, CategoryRecord>();

  constructor(seed: CategoryRecord[] = []) {
    for (const record of seed) {
      this.bySlug.set(record.slug, record);
    }
  }

  list(options: { includeArchived?: boolean } = {}): Promise<CategoryRecord[]> {
    const all = [...this.bySlug.values()];
    return Promise.resolve(
      options.includeArchived ? all : all.filter((c) => c.archivedAt === null),
    );
  }

  findBySlug(slug: string): Promise<CategoryRecord | null> {
    return Promise.resolve(this.bySlug.get(slug) ?? null);
  }

  create(input: CategoryWriteInput): Promise<CategoryRecord> {
    const record = this.toRecord(input);
    this.bySlug.set(record.slug, record);
    return Promise.resolve(record);
  }

  update(slug: string, input: CategoryWriteInput): Promise<CategoryRecord> {
    const record = this.toRecord(input);
    this.bySlug.set(slug, record);
    return Promise.resolve(record);
  }

  private toRecord(input: CategoryWriteInput): CategoryRecord {
    return {
      slug: input.slug,
      labelEs: input.labelEs,
      labelEn: input.labelEn,
      parentSlug: input.parentSlug,
      vertical: input.vertical,
      sort: input.sort,
      archivedAt: input.archivedAt,
      translations: input.translations.map((t) => ({
        locale: t.locale,
        label: t.label,
      })),
    };
  }
}

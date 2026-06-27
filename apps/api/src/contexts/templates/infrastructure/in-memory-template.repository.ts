import { TemplateRepository } from '../domain/ports/template.repository';
import { Template, TemplateSnapshot } from '../domain/template';
import { TemplateId } from '../domain/template-id';

export class InMemoryTemplateRepository implements TemplateRepository {
  private store = new Map<string, TemplateSnapshot>();

  save(t: Template): Promise<void> {
    this.store.set(t.id.value, t.toSnapshot());
    return Promise.resolve();
  }

  findById(id: TemplateId): Promise<Template | null> {
    const snap = this.store.get(id.value);
    return Promise.resolve(snap ? Template.fromSnapshot(snap) : null);
  }

  listAll(): Promise<Template[]> {
    return Promise.resolve(
      [...this.store.values()].map((s) => Template.fromSnapshot(s)),
    );
  }

  delete(id: TemplateId): Promise<void> {
    this.store.delete(id.value);
    return Promise.resolve();
  }
}

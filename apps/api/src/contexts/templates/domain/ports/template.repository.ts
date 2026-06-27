import { Template } from '../template';
import { TemplateId } from '../template-id';

export const TEMPLATE_REPOSITORY = Symbol('TemplateRepository');

export interface TemplateRepository {
  save(t: Template): Promise<void>;
  findById(id: TemplateId): Promise<Template | null>;
  listAll(): Promise<Template[]>;
  delete(id: TemplateId): Promise<void>;
}

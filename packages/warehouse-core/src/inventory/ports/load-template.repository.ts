import { LoadTemplate } from '../load-template.js';
import { LoadTemplateId } from '../load-template-id.js';
import { ScopeId } from '../../kernel/index.js';
import { LoadTemplateStatus } from '../inventory-enums.js';

export const LOAD_TEMPLATE_REPOSITORY = Symbol('LoadTemplateRepository');

/** Filter for listing load templates within a scope. AND-combined. */
export interface ListLoadTemplatesFilter {
  status?: LoadTemplateStatus;
}

export interface LoadTemplateRepository {
  save(template: LoadTemplate): Promise<void>;
  findById(id: LoadTemplateId): Promise<LoadTemplate | null>;
  /**
   * Resolves a load template by its human code within a scope. Codes are
   * unique per scope (the caller/DB enforces it); used to reject duplicates on
   * create and to look a kit up by its label.
   */
  findByCode(scopeId: ScopeId, code: string): Promise<LoadTemplate | null>;
  findByScope(
    scopeId: ScopeId,
    filter: ListLoadTemplatesFilter,
  ): Promise<LoadTemplate[]>;
}

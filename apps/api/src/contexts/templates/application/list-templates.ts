import { TemplateRepository } from '../domain/ports/template.repository';
import { TemplateView, toTemplateView } from './template-view';

export class ListTemplates {
  constructor(private readonly repo: TemplateRepository) {}

  async execute(): Promise<TemplateView[]> {
    const templates = await this.repo.listAll();
    return templates.map(toTemplateView);
  }
}

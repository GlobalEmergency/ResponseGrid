import { TemplateRepository } from '../domain/ports/template.repository';
import { TemplateId } from '../domain/template-id';
import { TemplateNotFoundError } from './template-not-found.error';

export interface DeleteTemplateCommand {
  id: string;
}

export class DeleteTemplate {
  constructor(private readonly repo: TemplateRepository) {}

  async execute(cmd: DeleteTemplateCommand): Promise<void> {
    const id = TemplateId.fromString(cmd.id);
    const existing = await this.repo.findById(id);
    if (!existing) throw new TemplateNotFoundError(cmd.id);
    await this.repo.delete(id);
  }
}

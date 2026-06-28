import { TemplateRepository } from '../domain/ports/template.repository';
import { Template } from '../domain/template';
import { TemplateId } from '../domain/template-id';

export interface CreateTemplateCommand {
  name: string;
  description: string;
  dontBringList: string[];
  recommendedList: string[];
  defaultAnnouncement?: string;
}

export class CreateTemplate {
  constructor(private readonly repo: TemplateRepository) {}

  async execute(cmd: CreateTemplateCommand): Promise<{ id: string }> {
    const template = Template.create({
      id: TemplateId.create(),
      name: cmd.name,
      description: cmd.description,
      dontBringList: cmd.dontBringList,
      recommendedList: cmd.recommendedList,
      defaultAnnouncement: cmd.defaultAnnouncement ?? null,
    });
    await this.repo.save(template);
    return { id: template.id.value };
  }
}

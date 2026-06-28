import { EmergencyRepository } from '../domain/ports/emergency.repository';
import { TemplateRepository } from '../../templates/domain/ports/template.repository';
import { TemplateId } from '../../templates/domain/template-id';
import { TemplateNotFoundError } from '../../templates/application/template-not-found.error';
import { Emergency } from '../domain/emergency';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { Slug } from '../domain/slug';
import { SlugAlreadyExistsError } from './slug-already-exists.error';

export interface CreateEmergencyFromTemplateCommand {
  templateId: string;
  name: string;
  slug: string;
  country: string;
}

export class CreateEmergencyFromTemplate {
  constructor(
    private readonly emergencyRepo: EmergencyRepository,
    private readonly templateRepo: TemplateRepository,
  ) {}

  async execute(
    cmd: CreateEmergencyFromTemplateCommand,
  ): Promise<{ id: string; slug: string }> {
    const templateId = TemplateId.fromString(cmd.templateId);
    const template = await this.templateRepo.findById(templateId);
    if (!template) throw new TemplateNotFoundError(cmd.templateId);

    const slug = Slug.fromString(cmd.slug);
    const existing = await this.emergencyRepo.findBySlug(slug);
    if (existing) throw new SlugAlreadyExistsError(slug.value);

    const emergency = Emergency.create({
      id: EmergencyId.create(),
      name: cmd.name,
      slug,
      country: cmd.country,
      dontBringList: template.dontBringList,
      recommendedList: template.recommendedList,
      announcement: template.defaultAnnouncement,
    });

    await this.emergencyRepo.save(emergency);
    return { id: emergency.id.value, slug: slug.value };
  }
}

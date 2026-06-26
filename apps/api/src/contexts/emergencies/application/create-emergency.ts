import { EmergencyRepository } from '../domain/ports/emergency.repository';
import { Emergency } from '../domain/emergency';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { Slug } from '../domain/slug';
import { SlugAlreadyExistsError } from './slug-already-exists.error';

export interface CreateEmergencyCommand {
  name: string;
  slug?: string;
  country: string;
}

export class CreateEmergency {
  constructor(private readonly repo: EmergencyRepository) {}

  async execute(cmd: CreateEmergencyCommand): Promise<{ id: string; slug: string }> {
    const slug = cmd.slug ? Slug.fromString(cmd.slug) : Slug.fromName(cmd.name);
    const existing = await this.repo.findBySlug(slug);
    if (existing) throw new SlugAlreadyExistsError(slug.value);
    const emergency = Emergency.create({
      id: EmergencyId.create(),
      name: cmd.name,
      slug,
      country: cmd.country,
    });
    await this.repo.save(emergency);
    return { id: emergency.id.value, slug: slug.value };
  }
}
